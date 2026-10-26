# 19 — E4.1 Instrumentos y Compras de inversión: Test plan

Specification: [19-instrumentos-compras-inversion-specification.md](19-instrumentos-compras-inversion-specification.md)
Status: DRAFT — diseño de pruebas previo a código; ningún resultado declarado.
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
incompletas antes de mutar y revalidación de la versión destino); sin ejecutar nada.

Matriz provisional y determinista. No existe implementación de E4.1, no se ha ejecutado
ninguna suite y no se declara PASS ni cobertura. Los comandos usan el runner real del
repositorio (`bun test` bajo el script `test`, `bun run test:e2e` y
`python3 scripts/verify --full`); las rutas de prueba son propuestas y se confirmarán al
autorizar desarrollo. Datos exclusivamente ficticios; sin DB, claves, factores ni trazas en
la evidencia. Los casos de retroactividad, preservación de divisa/factor histórico,
motor único, límites de magnitud y cobertura parcial se marcan explícitamente.

| Acceptance ID | Preconditions and action | Expected result | Automated/manual method and command | Local / CI platform and owner | Expected evidence | Actual result / status | Candidate / run date / evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E4.1-AC-01 | Alta de Instrumento solo con nombre, sin ISIN; nombre de 121 caracteres; `divisaReferencia="EURO"` | `Ixxx` único e inmutable, primer ID `I1001` en base sin Instrumentos, estado Activa; nombre 1–120 literal; ISIN/evidencia/`divisaReferencia` NULL o ISO 4217; nombre largo y divisa inválida 422 sin fila; visible en listado; sin Movimiento ni cambio de efectivo/cantidad | API/SQLite real: alta, rechazos y lectura; `bun test apps/api/src/instrumentos.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions API/SQLite y fila `instrumentos`; salida de suite | unrun — DRAFT sin código | — |
| E4.1-AC-02 | Alta con ISIN + evidencia; alta sin evidencia; ISIN en minúsculas; espacio interior; evidencia de 201 caracteres | Primera guarda normalizada y la muestra; las demás 422 sin Instrumento parcial; validación sintáctica ASCII `[A-Z0-9]{12}`, sin validez registral | API real con ambos payloads; `bun test apps/api/src/instrumentos.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions 201/422; tablas y auditoría sin fila parcial | unrun — DRAFT sin código | — |
| E4.1-AC-03 | Dos altas con el mismo ISIN variando caja/espacios de borde | Segunda 422 con enlace al existente; sin fusión ni sobrescritura; concurrentes producen un solo Instrumento | API real, comparación normalizada y concurrencia; `bun test apps/api/src/instrumentos.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de unicidad normalizada; conteo de filas | unrun — DRAFT sin código | — |
| E4.1-AC-04 | Crear dos Instrumentos con el mismo nombre | Dos IDs distintos, sin fusión; nombre no clave | API real; `bun test apps/api/src/instrumentos.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de dos IDs y listado | unrun — DRAFT sin código | — |
| E4.1-AC-05 | Renombrar un Instrumento con Compras; repetir sin `motivo` | Conserva `Ixxx`, Compras, posiciones e historial; `instrumento_audit` con revisión, motivo, actor, UTC y antes/después; sin motivo 422 | API/SQLite; `bun test apps/api/src/instrumentos.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de ID, Compras y fila de auditoría; salida de suite | unrun — DRAFT sin código | — |
| E4.1-AC-06 | Editar ISIN/evidencia de un Instrumento con Compras | Guarda con revisión, motivo y auditoría; revalida unicidad; Compras y efectivo/cantidad intactos | API real; `bun test apps/api/src/instrumentos.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de campos, auditoría y Compras sin cambio | unrun — DRAFT sin código | — |
| E4.1-AC-07 | Desactivar con revisión/motivo, consultar, intentar compra, reactivar, revisión obsoleta y DELETE | Inactivo no seleccionable ni aceptado (422 `VALIDATION`); historial visible; reactivar permite comprar; obsoleta 409 `REVISION_CONFLICT` sin escritura; DELETE 404 `NOT_FOUND` sin escritura | API/UI real; `bun test apps/api/src/instrumentos.test.ts` + `bun run test:e2e tests/e2e/inversiones.spec.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions 422/409/404 y recorrido navegador; PNG `artifacts/e4-1/` | unrun — DRAFT sin código | — |
| E4.1-AC-08 | Comprar el mismo Instrumento en `S004` «Cartera de inversión demo» y `S006` «Cartera secundaria demo» (creado por el servicio) | Dos posiciones por Saldo+Instrumento, con cantidad y compras independientes | API/SQLite y motor de posición; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de dos claves y cantidades independientes | unrun — DRAFT sin código | — |
| E4.1-AC-09 | Compra EUR sin cambio; con `cambio="1.000000"`; con `cambio="1.100000"` | Las dos válidas guardan cantidad/precio/divisa/importe, el efectivo baja una vez y la cantidad sube; la tercera 422 sin escritura; sin Movimiento | API real + consulta de efectivo/posición; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de importes exactos, filas y conteo de Movimientos | unrun — DRAFT sin código | — |
| E4.1-AC-10 | Compra en divisa ficticia con cambio histórico | Conserva cantidad, precio, divisa, cambio y EUR; efectivo baja una vez; sin Movimiento | API/SQLite; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de campos decimales y efectivo; conteo de Movimientos | unrun — DRAFT sin código | — |
| E4.1-AC-11 | Registrar después otra Compra con cambio distinto | Compra anterior, efectivo y cantidad no cambian; sin recálculo | API con dos cambios ficticios; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions antes/después de Compra y efectivo | unrun — DRAFT sin código | — |
| E4.1-AC-12 | Compra con comisión incluida; comisión > importe; comisión negativa | La válida muestra desglose y el efectivo baja por el importe, no por importe+comisión; las otras dos 422 sin escritura | API real y cálculo de efectivo; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de comisión e importe; comparación de efectivo | unrun — DRAFT sin código | — |
| E4.1-AC-13 | Importe EUR distinto de `cantidad×precio×cambio` | Conserva el importe observado; diferencia informativa; sin sobrescritura ni redondeo | API/UI real; `bun test apps/api/src/compras.test.ts` + E2E | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de importe y diferencia; PNG del formulario | unrun — DRAFT sin código | — |
| E4.1-AC-14 | Cantidad 9 decimales, precio/cambio 7; límites 8/6/6; EUR en céntimos | Exceso 422 en API y rechazo en persistencia sin fila ni redondeo; límites de escala aceptados; EUR exacto sin float | Motor puro + API + intento SQL directo; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de límites, rechazo de persistencia y valores exactos | unrun — DRAFT sin código | — |
| E4.1-AC-15 | Fecha futura, inválida, 29 de febrero bisiesto y pasada válida | Futuro/inválida 422; bisiesto y pasado aceptados; fecha civil literal sin desplazamiento | API con fechas ficticias; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions 422/201 y fecha persistida literal | unrun — DRAFT sin código | — |
| E4.1-AC-16 | Compra que a su fecha dejaría efectivo negativo | 422 `INSUFFICIENT_CASH` con `disponible`/`necesario`/`minimo`/`fecha`; sin escritura; aperturas y hechos intactos; nunca 409 | API + cálculo de efectivo; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de bloqueo, código, importes y tablas sin cambio | unrun — DRAFT sin código | — |
| E4.1-AC-17 | Instrumento/Saldo inexistente o inactivo; tipo incorrecto; efectivo = inversión; `Efectivo`/`Movimientos` | 422 con motivo; sin Compra, efectivo, cantidad ni auditoría de éxito | API real; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de error y tablas sin cambio | unrun — DRAFT sin código | — |
| E4.1-AC-18 | Fallo inyectado tras reservar ID o antes de auditar | Rollback completo; sin Compra, efecto, contador consumido ni auditoría parcial | Prueba de fallo transaccional; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de rollback y comparación de tablas/contador | unrun — DRAFT sin código | — |
| E4.1-AC-19 | Reintento con misma idempotency-key/payload; después payload distinto | Un hecho y un cargo; conflicto sin segunda Compra | API real, replay y payload alterado; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de conteo, importe y respuesta de reintento | unrun — DRAFT sin código | — |
| E4.1-AC-20 | (a) Dos altas concurrentes sin efectivo suficiente para ambas; (b) dos revisiones desactualizadas; (c) confirmación de un Movimiento previsualizado con huella/contexto desactualizado | (a) una escritura y la otra 422 `INSUFFICIENT_CASH` por suficiencia recalculada; (b) una escritura y la otra 409 `REVISION_CONFLICT`; (c) 409 `IMPACT_CHANGED` sin escritura; cada respuesta lleva solo el código de su causa; sin negativo, doble cargo ni 409 genérico por concurrencia. Las rutas de Compra no transportan huella y no emiten `IMPACT_CHANGED`. | Dos conexiones/procesos reales; (a)(b) `bun test apps/api/src/compras.test.ts`, (c) `bun test apps/api/src/movimientos.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de carrera, códigos distintos, conteo y efectivo final | unrun — DRAFT sin código | — |
| E4.1-AC-21 | Listado con `saldo`, `saldoEfectivo`, `saldoInversion`, fechas, Estado y paginación; búsqueda ISIN/nombre | `saldo` casa con efectivo o inversión; específicos estrechan; filtros/página estables; anuladas consultables; búsqueda normalizada y `%`/`_` literales | API real con >100 filas ficticias; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de filtros, orden y páginas | unrun — DRAFT sin código | — |
| E4.1-AC-22 | Consultar ficha/posición de un Instrumento | Cantidad = suma de compras vigentes; sin Ventas, valor, resultado ni rentabilidad; «No disponible» sin 0; cobertura parcial visible | API/UI real; `bun test apps/api/src/compras.test.ts` + E2E | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de cantidad; PNG de ficha sin valoración | unrun — DRAFT sin código | — |
| E4.1-AC-23 | Consultar `S003`, `S004` y `S001` antes/después de una Compra | Fórmula con ventas 0 estructural; efectivo separado de la posición; `S004` sigue sin valoración; `S001` no cambia; Ventas no instaladas | Motor puro + API; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de fórmula y DTO; comparación con Saldos | unrun — DRAFT sin código | — |
| E4.1-AC-24 | Crear, rectificar y anular Compras; consultar referencia temporal | Máximo sin cambios por Compras; fuente Inversión «pendiente hasta E4.2» (E4.2-AC3); sin reloj ni fecha inventada | Motor de referencia + API; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de máximo igual y ausencia de `Date.now` | unrun — DRAFT sin código | — |
| E4.1-AC-25 | Rectificar Compra vigente con payload completo; repetir con revisión obsoleta y omitiendo `precio` | Impacto efectivo/cantidad antes/después; motivo/revisión; atómico; auditoría; posición recalculada; payload completo obligatorio; revisión obsoleta 409 `REVISION_CONFLICT` y campo omitido 422 `VALIDATION`, sin escritura | API/UI real; `bun test apps/api/src/compras.test.ts` + E2E | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de impacto, revisión, códigos y auditoría; PNG de preview | unrun — DRAFT sin código | — |
| E4.1-AC-26 | Anular con revisión/motivo; repetir con la revisión ya vigente; revisión obsoleta | Queda Anulada, no computa, no se borra; segunda anulación 422 `VALIDATION` por Estado no elegible y revisión obsoleta 409 `REVISION_CONFLICT`, sin escritura; auditoría consultable | API real; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de estado, códigos, cantidad y auditoría | unrun — DRAFT sin código | — |
| E4.1-AC-27 | Crear, rectificar y anular Compras; comparar Movimientos/Presupuesto | Sin cambio en número de Movimientos; sin Gasto/Compra, Partida, Referencia ni ejecución | API/SQLite, comparación antes/después; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de conteo y tablas de presupuesto | unrun — DRAFT sin código | — |
| E4.1-AC-28 | Transferir efectivo al bróker y después comprar | Dos hechos distintos; cada uno afecta al efectivo una vez; ninguno crea el otro | API real de Transferencia + Compra; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de dos IDs, efectivo y ausencia de relación automática | unrun — DRAFT sin código | — |
| E4.1-AC-29 | Acceso sin sesión, sin CSRF/Origin y error interno | 401/403; sin escritura; errores sin SQL/importes/tokens; sin DELETE ni fixtures | HTTP real MFA/Origin/CSRF; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de códigos y logs/errores saneados | unrun — DRAFT sin código | — |
| E4.1-AC-30 | Recorrer listado, ficha, alta, W7/W8 y W9/W10 a 390/1440 con teclado; comprobar filtro de Estado y alcance de W8/W10 | Flujos operables, foco visible y devuelto al aviso, etiquetas, sin overflow, tema claro, borrador conservado, botones deshabilitados sin motivo; en W1/W4 «Todos» muestra `I1003` Inactiva y «Activos» la oculta; W8 declara «Todas (3)» y muestra la Anulada solo con «Ver»; W9/W10 cubren rectificación y anulación | Playwright real, capturas 390×844 y 1440×1000; `bun run test:e2e tests/e2e/inversiones.spec.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | PNG ficticios inspeccionados `artifacts/e4-1/`; notas de foco/overflow | unrun — DRAFT sin código | — |
| E4.1-AC-31 | Provocar vacío, carga, error de fuente, 409 y sesión expirada | Estados distintos/accionables; «No disponible» con motivo; sin 0 ficticio; borrador conservado | Playwright con API real e intercepción solo de estados; `bun run test:e2e tests/e2e/inversiones.spec.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | PNG de estados; assertions de borrador y foco | unrun — DRAFT sin código | — |
| E4.1-AC-32 | Inspeccionar IDs y auditorías dedicadas; intentar UPDATE/DELETE sobre ellas | IDs únicos/inmutables; una fila por revisión con actor, UTC, motivo y JSON antes/después; triggers abortan; `audit` sin cambios | SQLite/API; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de IDs, filas de auditoría y triggers; sin DELETE | unrun — DRAFT sin código | — |
| E4.1-AC-33 | (a) actualizar una base 13→15 sin tablas v14; (b) congelar el manifiesto y SHA-256 de `C14-COMPARTIDOS-FCE1107` (desde `fce1107`) y actualizar su fixture aislado generado por el commit fuente, con datos sintéticos, a 15; (c) congelar el manifiesto y SHA-256 de `C14-VEHICULOS-C69E343` (desde `c69e343`) y actualizar su fixture aislado generado por el commit fuente, con datos sintéticos, a 15; (d) intentar abrir variantes v14 desconocidas o incompletas (objeto ausente, SQL alterado, objeto extra, tablas sintéticas, contratos mezclados o v14 de `main` no verificado); (e) abrir una base marcada 16; (f) ejecutar el gate pre-DEV con `origin/main` en 15+, la 15 ocupada, un v14 de `main` no verificado o manifiestos/hashes sin registrar; (g) inspeccionar el SQL de migración y la lógica/manifiesto de restore y restaurar copias 13, 14 verificadas, 14 desconocida y 15 en directorios nuevos | (a) sube 13→15 con filas previas preservadas y sin «Esquema no compatible»; (b) el manifiesto y SHA-256 de Compartidos están registrados antes de DEV; su fixture aislado coincide y sube 14→15 conservando tablas, índices, triggers y filas; (c) el manifiesto y SHA-256 de Vehículos están registrados antes de DEV; su fixture aislado coincide y sube 14→15 conservando tablas, triggers y filas; (d) toda variante desconocida o incompleta se rechaza antes de `BEGIN IMMEDIATE`, `journal_mode`, DDL, backup o cambio de `schema_version`, con el literal `Contrato de esquema v14 desconocido o incompleto; no se modificará esta base.`, sin escribir; el número 14 o las tablas sintéticas no acreditan compatibilidad; (e) la 16 se rechaza antes de mutar; (f) si `main` está en 15 o más, la 15 está ocupada, `main` contiene un v14 no verificado o faltan manifiestos/hashes, el gate pre-DEV se detiene y no se implementa la 15; (g) migración aditiva sin `DROP`/`ALTER` destructivo ni borrado de tablas ajenas; las compuertas incluyen `database.ts` y `database-identity.ts` con `schemaVersion = 15`, `database-schema.ts` con `[1..14, version]` y `backup.ts` con `1..15`; la etiqueta es `e4.1-v15`; el restore solo se hace en directorio nuevo y verifica el manifiesto de una copia v14 antes de publicarla: una copia de 13 o 14 verificada conserva su esquema de origen y no incorpora tablas v15, una copia v14 desconocida se rechaza sin publicar, y una copia de 15 recupera Instrumentos, Compras y las dos auditorías y vacía sesiones, desafíos e intentos (incluidas `instrumento_attempts` y `operacion_attempts`); rollback ante fallo | Fixtures aisladas generadas por `fce1107` y `c69e343` con manifiesto y SHA-256, manifiestos negativos (ausente/alterado/extra/sintético/mezclado), upgrade, rearranque 15, versión 16, gate pre-DEV con `origin/main`, restore aislado de 13/14/15 y copia v14 desconocida; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu/Linux glibc: obligatorio; gate pre-DEV manual/CI sobre `origin/main` | Assertions de manifiesto/hash, rechazo sin mutación, esquema/filas ajenas intactas, etiqueta, rechazo de 16, gate de destino y restauración con intentos vacíos; salida de suite | unrun — DRAFT sin código | — |
| E4.1-AC-34 | Simular error de la fuente de Compras/efectivo (tabla ilegible o consulta fallida) | «No disponible» con causa concreta; identidad/filtros conservados; sin 0, reparación ni guardado que presuma integridad | API/UI con fallo de fuente; `bun run test:e2e tests/e2e/inversiones.spec.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | PNG de error; assertions de motivo y ausencia de escritura | unrun — DRAFT sin código | — |
| E4.1-AC-35 | Retroactiva con apertura 1.000,00; entrada 500,00 el 2026-02-01; salida 1.800,00 el 2026-03-01; Compra de 100,00 el 2026-02-10; repetir con salida 200,00; mismo día con entrada 100,00 y Compra 1.050,00 / 1.150,00 | Primer caso 422 `INSUFFICIENT_CASH` con fecha 2026-03-01 y mínimo −400,00; segundo 201 y saldo posterior 1.200,00; mismo día: 1.050,00 aceptada (cierre 50,00) y 1.150,00 rechazada con fecha 2026-02-10 y mínimo −50,00, independiente del orden | API + motor puro de suficiencia con ventana posterior; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de 422/201, código, fecha, importe del mínimo y tablas sin cambio | unrun — DRAFT sin código | — |
| E4.1-AC-36 | Instrumento con Compra USD (cambio 0,900000); editar su divisa de referencia a EUR | Solo cambia el maestro con auditoría; la Compra conserva USD, 0,900000, precio, 1.125,00 € y comisión; efectivo/cantidad iguales | API/SQLite; `bun test apps/api/src/instrumentos.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de campos históricos y auditoría del maestro | unrun — DRAFT sin código | — |
| E4.1-AC-37 | Abrir listado, ficha y W7/W8 con posiciones calculadas | Declaración de cobertura parcial visible; no se presenta como posición completa; sin 0 ni datos no registrados | Playwright real; `bun run test:e2e tests/e2e/inversiones.spec.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | PNG de listado/ficha con la etiqueta; assertion de texto | unrun — DRAFT sin código | — |
| E4.1-AC-38 (integración/regresión) | `GET /api/saldos/S003` y `GET /api/inversiones/efectivo?saldo=S003` sin `fecha`, y con `fecha` | Sin `fecha` misma cifra al céntimo del mismo motor; con `fecha` corte etiquetado distinto; ninguna escribe | API + motor puro; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de igualdad exacta, etiqueta de vista y tablas sin cambio | unrun — DRAFT sin código | — |
| E4.1-AC-39 (integración/regresión) | `flujo-mensual` con `S003` en `liquidez=1` (posición no nula: apertura ficticia de 3.200,00 y Compra de 1.389,60), `=0` y `NULL`; una Compra válida con efectivo `S003` e inversión `S004` y `S001` antes/después | `=1`: `liquidez.incluidos` con `S001` y `S003`, `excluidos` sin `S003`, `metrics.liquidez.estado = "Verificado"`, `metrics.liquidez.subtotal = null` y `metrics.liquidez.valor = posición S001 + 1.810,40`; `metrics.liquidez.motivo` contiene «Cobertura histórica no importada: la posición de inversión solo incluye Compras registradas en la aplicación» y la UI la muestra; `=0`: solo `S001`; `NULL`: `excluidos` con «Liquidez sin informar», `metrics.liquidez.estado = "Parcial"` y `metrics.liquidez.subtotal` de `S001`; la Compra no altera posición ni Movimientos de `S001` | Regresión de integración API + UI; `bun test apps/api/src/flujo-mensual.test.ts` + `bun run test:e2e tests/e2e/flujo-mensual.spec.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de `incluidos`, `excluidos`, valor, cobertura y expectativa actualizada | unrun — DRAFT sin código | — |
| E4.1-AC-40 (integración/regresión) | `GET /api/saldos/S004` y endpoint de efectivo para `S004` (rechazo); previsualizar Transferencia sobre `S004` | `null` con condición `pendiente_motor` y motivo de valoración E4.3; endpoint de efectivo 422 sin cifra; el preview no inventa el extremo posterior | API real; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de `null`, 422, motivo y ausencia de cifra | unrun — DRAFT sin código | — |
| E4.1-AC-41 (integración/regresión) | En este orden: (1) partir de `S003` **sin Movimientos y sin Compras** y fijar `permiteSalidaExterior=true` **antes** de que tenga Compras (con Movimientos, el guard E1.1 lo bloquearía; después de una Compra, el guard de AC-42 lo bloquea con 409 `HISTORY_LOCKED`); (2) crear las Compras del fixture; (3) Partida activa con ancestros activos; (4) Subtipo válido para el Ingreso; (5) Partida ligada a una Deuda activa para la Amortización: previsualizar Gasto e Ingreso sobre `S003`, Transferencia `S001 → S003` y `S003 → S001`, y Amortización desde `S003` | En los cuatro tipos el extremo del Saldo de prueba utilizado (`S003`) se calcula antes/después con el motor de efectivo; ninguna previsualización devuelve 422 `EXTERIOR_PERMISSION`, `DEBT_REQUIRED`, `INACTIVE_DEBT` ni `INACTIVE_CLASSIFICATION` por precondición; pendientes ya no afirma que falta ese motor y declara valoración E4.3; no escribe, ni reserva ID, ni audita | API + motor; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions antes/después, texto de pendientes y tablas sin cambio | unrun — DRAFT sin código | — |
| E4.1-AC-42 (integración/regresión) | Con Compra vigente y anulada en `S003`: cambiar los cinco campos protegidos; desactivar/reactivar; cambiar nombre | Los cinco 409 `HISTORY_LOCKED` sin escritura; desactivar/reactivar funcionan y conservan Compras; el nombre sí cambia | API/SQLite; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions 409, filas y auditoría del Saldo | unrun — DRAFT sin código | — |
| E4.1-AC-43 | Consultar auditoría de Instrumento y de Compra tras cada acción; ID inexistente | Revisiones ordenadas con acción, motivo, actor, UTC y JSON antes/después; anulación con estado Anulada; 404 si no existe; solo lectura; `audit` intacta | API real; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de orden, contenido y 404; comparación de `audit` | unrun — DRAFT sin código | — |
| E4.1-AC-44 | Reloj fijo `2026-01-15T23:30:00Z`, `2026-01-16T00:30:00Z`, `2026-07-15T22:30:00Z`, `2026-03-29T00:30:00Z` y `2026-10-25T00:30:00Z` | Máximo admitido 16/01, 16/01, 16/07, 29/03 y 25/10 de 2026 (día civil Madrid); día siguiente 422; fecha guardada literal | Motor puro `spanishToday` + API; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de fecha máxima y persistencia literal | unrun — DRAFT sin código | — |
| E4.1-AC-45 | Rectificar omitiendo `precio`; `null` en nullable y en `importeEur`; incluir Instrumento/Saldos | Omisión 422 con campo; `null` limpia nullable; `null` en importe 422; Instrumento/Saldos 422 sin escritura; válida guarda revisión y auditoría | API real; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de 422 por campo y de limpieza efectiva | unrun — DRAFT sin código | — |
| E4.1-AC-46 | Rectificar al alza con saldo posterior negativo; rectificar a importe válido; mover fecha atrás; mismo día en distinto orden de captura; repetir con revisión obsoleta | Primera 422 `INSUFFICIENT_CASH` con `disponible`/`necesario`/`minimo`/`fecha`, sin escritura; válida aceptada; resultado idéntico en ambos órdenes; revisión obsoleta 409 `REVISION_CONFLICT` sin escritura | API + motor de suficiencia; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de 422/201/409, código, mínimo, fecha y determinismo de orden | unrun — DRAFT sin código | — |
| E4.1-AC-47 | Anular y crear otra con distinto Instrumento y/o Saldos, con el mismo `motivo` textual (sin campo de enlace) | Original Anulada fuera de efectivo/posición; nueva computa en sus Saldos; ambas auditadas; localizables por fecha/estado en el listado y por `motivo` en la auditoría; identidad original intacta y sin vínculo persistido | API/SQLite; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de estados, cantidades y auditoría | unrun — DRAFT sin código | — |
| E4.1-AC-48 | Escenario con 0, 1 y N Saldos `Efectivo`/`Inversiones` (segundo creado por el servicio); consultar opciones | `saldosEfectivo` y `saldosInversion` separados y sin preselección; 0 bloquea y explica; 1 exige selección vacía; N lista todos con cifra, sin agregado; el módulo muestra una línea por Saldo | API/UI real; `bun test apps/api/src/compras.test.ts` + E2E | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de ambas listas, ausencia de total y PNG de selectores | unrun — DRAFT sin código | — |
| E4.1-AC-49 (integración/regresión) | Desactivar un Saldo con Compras; consultar efectivo/posición/listado/selectores; reactivar | Efectivo y posición siguen incluyendo sus Compras y son consultables; no seleccionable; reactivar lo recupera; Liquidez mantiene su filtro | API/SQLite; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de cifras, selectores y estado del Saldo | unrun — DRAFT sin código | — |
| E4.1-AC-50 | Cantidad `90071992.54740991`, precio y cambio `9007199254.740991`; una unidad escalada por encima en cada campo | Límite aceptado y persistido exacto; por encima 422 sin fila ni redondeo; sin `number` en el cálculo | Motor puro + API + persistencia; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de límite, rechazo y valores exactos | unrun — DRAFT sin código | — |
| E4.1-AC-51 | Referencia con cantidad `90071992.54740991`, precio `9007199254.740991` y cambio `1.000000` (producto > 2⁵³; representación escalada > 64 bits); comparar con el valor exacto | Producto exacto sin desbordamiento, truncamiento ni saturación; visualización redondeada a céntimos solo para presentar; cálculo interno `BigInt` no recortado al límite de entrada ni a 64 bits; límite por campo sigue en 422 por encima | Motor puro decimal exacto + API; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions del producto exacto, redondeo de presentación y rechazo del límite por campo | unrun — DRAFT sin código | — |
| E4.1-AC-52 | Invocar los tres `POST` de impacto y los GET de listado, ficha, auditoría, efectivo y opciones; comparar tablas, contadores, revisiones y auditoría | Ninguna ruta escribe: sin filas nuevas ni modificadas en Compras, Instrumentos, operaciones, auditorías o intentos; contadores sin mover, sin ID reservado y sin cambio de revisión | API/SQLite con snapshot antes/después; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions de tablas, contadores y revisiones idénticas; respuestas de solo lectura | unrun — DRAFT sin código | — |
| E4.1-AC-53 (integración/regresión) | Previsualizar Gasto sobre `S003`; registrar una Compra que cambie el efectivo; confirmar con la huella y `contextRevision` previas; repetir con un Gasto previsualizado sobre `S001` (sin Compras) y una Compra en `S003` | 409 `IMPACT_CHANGED` sin escribir el Movimiento (no `REVISION_CONFLICT`: la revisión del Movimiento no cambió); el efectivo refleja solo la Compra; borrador conservado; tras recalcular, la confirmación es válida. El caso ajeno devuelve también 409 `IMPACT_CHANGED` sin escritura y se acepta como sobre-invalidación segura de la huella global, no como defecto; tras recalcular, válido | API/Motor + comparación antes/después; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions 409, huella obsoleta, tablas sin cambio y reintento válido en ambos casos | unrun — DRAFT sin código | — |
| E4.1-AC-54 | `concepto`/`nota` de 2000 y 2001; `divisa` `US`, `USDD`, `usd`; `comisionEur` `5.001` | 2000 aceptado y literal; 2001, cada divisa inválida y la comisión de 3 decimales devuelven 422 con el campo, sin escritura ni redondeo | API real por campo; `bun test apps/api/src/compras.test.ts` | macOS: dev19 pendiente; CI Ubuntu: pendiente | Assertions 201/422 por campo y tablas sin cambio | unrun — DRAFT sin código | — |

## Regression checks

UNRUN. No se ejecutó `python3 scripts/verify`, `bun test`, typecheck, build ni E2E. La matriz
es un diseño previo a código; no acredita cobertura. Al autorizar desarrollo, ejecutar
focalmente la suite nueva y después `python3 scripts/verify --full` sobre el candidato.
Conservar las regresiones de Saldos, Movimientos, Transferencias, Deuda, Ciclos, Referencia
temporal, autenticación, backups y restauración. Un fallo esperado de fixture negativa no es
fallo de suite. macOS no sustituye la evidencia Linux/glibc de publicación/restauración.

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
- `apps/api/src/database-identity.ts`, `apps/api/src/database-schema.ts` y
  `apps/api/src/backup.ts`: `schemaVersion` pasa a `15` en `database-identity.ts` y sus listas
  admitidas a `1..15`, mientras `database-schema.ts` acepta `[1..14, version]` (con
  `version = 15`) y `backup.ts` acepta `1..15`; la etiqueta de la copia 15 es `e4.1-v15`.
  Antes de DEV se genera el manifiesto canónico completo de cada contrato (JSON sin indentación,
  orden `type`,`name`,`tbl_name`,`sql`, SHA-256 sobre la cadena UTF-8), se registra su
  SHA-256 en el testplan y en `apps/api/src/schema-contracts.json` (o constante equivalente que
  debe coincidir), y se reordena `database.ts` para que la verificación preceda a la transacción
  de identidad y a las PRAGMAs persistentes.
  Una base 13 sube a 15 sin tablas v14 conservando filas. Una base 14 **solo** sube si su
  manifiesto coincide exactamente con `C14-COMPARTIDOS-FCE1107` (fixture aislado generado por `fce1107` con datos sintéticos) o
  `C14-VEHICULOS-C69E343` (fixture aislado generado por `c69e343` con datos sintéticos); entonces preserva sus tablas, índices,
  triggers y filas. Una base 14 con objeto ausente, SQL alterado, objeto extra, tablas
  sintéticas (`compartidos_demo`/`vehiculos_demo`) o contratos mezclados se rechaza con el
  literal `Contrato de esquema v14 desconocido o incompleto; no se modificará esta base.`
  antes de `BEGIN IMMEDIATE`, `journal_mode`, DDL, backup o cambio de `schema_version`; el
  número 14 no acredita compatibilidad. Una base ya en 15 rearranca sin «Esquema no
  compatible»; los backups 13, 14 verificadas y 15 se restauran en directorio nuevo; el de 13
  o 14 conserva su esquema de origen y no incorpora tablas v15; una copia v14 desconocida se
  rechaza antes de publicar el directorio; el de 15 recupera Instrumentos, Compras y auditorías
  y vacía sesiones, desafíos e intentos (incluidas las dos tablas nuevas); una versión 16 se
  rechaza antes de mutar. La migración es aditiva: la prueba falla si el SQL contiene `DROP` o
  `ALTER` destructivo sobre tablas ajenas.
- Gate pre-DEV de destino: antes de implementar se comprueba `origin/main` mediante
  `git show origin/main:apps/api/src/database-identity.ts` y las migraciones vigentes. Si
  `main` está en 15 o más, la 15 está ocupada, `main` contiene un v14 no verificado o faltan
  los manifiestos/hashes, el gate falla y no se inicia DEV: la spec y este testplan se
  renumeran o completan y se repite la revisión. La reserva documental 15 no prevalece
  sobre un `main` avanzado.
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

UNRUN. Ningún AC tiene resultado funcional. La matriz tiene 54 AC (47 funcionales de E4.1 y
7 de integración/regresión). Las verificaciones previstas incluyen API/SQLite real,
comparación de tablas antes/después, dos procesos para concurrencia, rollback inyectado,
upgrade de esquema 13→15 y 14→15 con fixtures congelados generados por los commits fuente de Compartidos (`fce1107`) y
Vehículos (`c69e343`), manifiestos canónicos y SHA-256 registrados antes de DEV, rechazo antes
de mutar de variantes v14 desconocidas o incompletas, restauración aislada de 13, 14 verificadas,
14 desconocida y 15 en directorio nuevo (sin mezclar esquemas y con intentos vacíos), rechazo de
la versión 16 y gate pre-DEV sobre `origin/main`, igualdad al céntimo
entre `/api/saldos/{id}` y el endpoint de efectivo, y el determinismo de la convención de fin de
día. Los casos AC-35, AC-36, AC-37, AC-38, AC-39, AC-46, AC-50, AC-51, AC-52, AC-53 y AC-54
cubren respectivamente retroactividad negativa, preservación de divisa/factor histórico,
cobertura parcial, motor único, flag de Liquidez, rectificación retroactiva, límites de
entrada, cálculo interno exacto, no-escritura de impacto/GET, contexto invalidado por una
Compra —incluida la sobre-invalidación global de una vista previa ajena— y validación de
longitudes/divisa/comisión. Los códigos de error se comprueban literalmente:
`INSUFFICIENT_CASH` (422), `REVISION_CONFLICT` (409), `IMPACT_CHANGED` (409),
`HISTORY_LOCKED` (409), `VALIDATION` (422) y `NOT_FOUND` (404). No se declara PASS por
inspección documental ni por wireframes.

## Browser verification (web only)

UNRUN. Cuando exista UI autorizada, Playwright debe operar listado, ficha/posición, alta,
pestaña Compras (W7/W8) e impacto/rectificación/anulación (W9/W10) con API/SQLite reales a
390×844 y 1440×1000; inspeccionar capturas ficticias, teclado/foco, etiquetas, contraste real,
ausencia de overflow, estados deshabilitados sin motivo y devolución del foco al aviso. La
nota de cobertura histórica no importada de Liquidez se comprueba en
`tests/e2e/flujo-mensual.spec.ts` sobre el bloque «Liquidez actual». No guardar DB,
credenciales, tokens, storageState, factores ni trazas. La intercepción de red solo puede
modelar estados transitorios; las escrituras exitosas deben ser reales.

## Visual improvements (visual apps only)

No hay UI implementada que inspeccionar; no se inventa una evaluación visual desde los
wireframes. Las cinco mejoras se evaluarán sobre la UI real:
1. Claridad de la separación efectivo/posición y de la cantidad por Saldo, incluidos varios
   Saldos de efectivo sin agregado.
2. Legibilidad del desglose cantidad/precio/divisa/cambio/EUR/comisión en 390.
3. Impacto antes/después de rectificar/anular sin perder el contexto ni el motivo.
4. Estados «No disponible», «Sin posiciones», «Anulada» y cobertura parcial distinguibles.
5. Foco, teclado y orden de lectura en formularios de tres bloques y en el panel de impacto.

## Limitations and next action

DRAFT sin código ni UI; sin ejecución de suites. Los comandos y rutas de prueba son
propuestas verificadas contra `package.json`, `playwright.config.ts` y `scripts/verify`. El
aplazamiento de DT7 a E4.5/E4.12 está registrado en la especificación (§5.2, §12, §14) y no
se prueba en E4.1 porque no hay importación. Antes de DEV se revalida obligatoriamente el
destino con `origin/main` y las reservas abiertas, y se congelan los manifiestos v14 con sus
SHA-256; si `main` ya está en 15 o más, o falta un manifiesto, esta spec se detiene y se
renumera o completa. Siguiente acción: revisión independiente del delta, aprobación explícita
del usuario y, solo después, autorización de desarrollo. No
implementar, commitear ni ejecutar suites todavía.
