# 06 — E1.6 Cuota y amortización de Deuda: Test plan

Estado 2026-10-22: **30 AC actuales con verificación local; QA del producto completada sin bloqueantes; PR #34 abierta, corrección de fixture tras fallo de CI pendiente de revisión/CI por SHA.** Especificación [aprobada](06-deuda-specification.md); desarrollo autorizado expresamente por usuario en esta ejecución. Ningún resultado local equivale a aprobación de merge. AC31–33 son contratos futuros NO implementados ni contados como PASS.

## Matriz vigente de aceptación

Esta matriz sustituye el estado inicial de planificación. D1–D10 están en `apps/api/src/deudas.test.ts`; navegador real E1.6 en `tests/e2e/deudas.ts`, integrado en el recorrido E1.4/E1.5 y su restore/MFA. Las suites heredadas conservan sus aserciones financieras; se actualizan únicamente versión actual, columnas null y nombres de copias creadas por el nuevo esquema.

| AC | Verificación real y resultado local | Límites |
| --- | --- | --- |
| 01 | PASS D1/D4/D6 y navegador: alta/consulta Dxxx, Inicio/apertura explícitos, capital derivado | Sin histórico importado ni Movimiento/Saldo artificial de apertura |
| 02 | PASS D8: procesos reales, migración simultánea v6→7, reserva única, reintento misma clave, D1000 | Datos ficticios; contador técnico preparado para frontera >999 |
| 03 | PASS D2/D10 y UI: revisión, nombre/estado, bloqueo nuevas selecciones de Deuda inactiva y anulación histórica permitida | Estado es contrato app; no DELETE, también protegido en SQL |
| 04 | PASS D1/D9 y UI de Clasificación: enlace opcional único Partida→Deuda, varias Partidas para mismo ID | Sin selector Deuda contradictorio en Movimiento |
| 05 | PASS D2: Partida usada sin Deuda impide asignación retroactiva; enlace usado/apertura/Inicio usados protegidos; UI deshabilita campos | Ningún backfill ni procedimiento histórico inventado |
| 06 | PASS D1 y UI: cuota100=capital80+intereses20; banco400/principal920 en ejemplo aislado; único hecho | Gasto íntegro, sin otro registro económico |
| 07 | PASS D2/UI: componentes ausentes/cero capital/desigualdad/negativos/tercer decimal rechazados; intereses0 explícitos válidos en D2 | Sin TIN/TAE ni autorrelleno de cuota |
| 08 | PASS D2 y regresión E1.4: Gasto ordinario sin desglose conservado; componentes contradictorios rechazados | Sin FK editable Deuda en Movimiento |
| 09 | PASS D1/D7/UI: extraordinaria200 deriva capital200/intereses0; banco200/principal720 tras cuota; no Gasto | Payload UI null se trata como ausencia, no cifra; valores contradictorios rechazados |
| 10 | PASS D2/D7 y validación servidor: Partida sin Deuda/tipo/campos impropios rechazados; S000 derivado | No Transferencia ni Gasto sintético |
| 11 | PASS D3/D10 y regresión Saldos: Exterior No rechazado; Terminal/No controlado admitidos con permiso Sí, posiciones no calculables conservadas | No se presenta motor parcial como calculado |
| 12 | PASS D2 y regresión monetaria E1.4: cero/tercer decimal/componentes inválidos y límites EUR exactos | Parsing bigint, sin float/truncamiento/redondeo |
| 13 | PASS D1/D7/D9: oráculo banco130/Gasto170/principal720; t−1/t/t+1, varias Partidas por ID, apertura ausente≠cero y apertura negativa precontrol | Revisión SQL: agregado sin filtros Tipo/Control/Fecha inicio deuda; ausencia no rellenada |
| 14 | PASS D2/D8: igualdad→0, exceso bloqueado, dos pagos600 contra principal1000 admisibles por separado; solo uno persiste | Exceso solo sobre capital aplicable/verificable; sin orden horario por ID |
| 15 | PASS D3 Madrid/DST/hoy-mañana; cliente reutiliza opciones.hoy y max/rechazo previo a escritura, navegador opera fechas civiles | Regla app, sin cambiar Ciclos futuros |
| 16 | PASS D1 sin ciclo asignable; regresión E1.4/E1.5 de límites y ciclos | No crea Ciclo desde un pago |
| 17 | PASS D1 máximo financiero con extraordinaria y lectores comunes; regresión de rectificación/anulación E1.4 | Sin reloj como fuente de referencia financiera |
| 18 | PASS D10: extraordinaria exige REF en CAT011 y acepta Viaje válido; regresión R2/R9 conserva matriz/compatibilidad opcional | Fichas E3 siguen bloqueadas |
| 19 | PASS D2: rectificar cambia Deuda, ambas aparecen en preview y capital se sustituye sin duplicar; historial UI muestra componentes | ID estable y motivo; sin reapertura/cierre instalado |
| 20 | PASS D2/D10 y regresión de anulación: mismo ID/auditoría, sin efecto económico; Deuda inactiva no impide anular error | Devolución real no es anulación |
| 21 | PASS D3/D8 y regresión duplicados/UI E1.4: respuesta perdida reintenta un solo hecho; confirmación explícita de duplicado real | No se confunden coincidencia económica e intento técnico |
| 22 | PASS D2/D8/D10: nuevas entradas reales en financeRevision, contexto cambiado→409 sin escritura, revisión nueva | contextRevision técnica adicional en preview/confirmación; huella incluye Deudas y enlaces |
| 23 | PASS D3/D10: fallos inyectados en intento y auditoría conservan hechos/auditoría/IDs/contador/intentos y posiciones | Sin fallo real operativo ni recuperación destructiva |
| 24 | PASS D1 y navegador: ficha Deuda→Movimientos inicializa filtro por ID y selector; exactamente dos pagos vinculados; tipos separados | API permite consultar anulados sin sumarlos |
| 25 | PASS Chromium390/1440: listado/ficha/alta/selector/cuota/preview/extraordinaria; capturas inspeccionadas; foco teclado/contraste | Diseño aprobado reutilizado, sin nuevos tokens/librerías |
| 26 | PASS UI: vacío/carga, validación, regreso desde alta Deuda conserva borrador; errores/API404/409/422/MFA y regresión estados transitorios heredados | Sin persistir borrador en navegador ni valores demo para ocultar errores |
| 27 | PASS D6 y suites de seguridad/API: MFA/CSRF/Origin, rechazo de derivados y DELETE inexistente; errores genéricos | Seguridad heredada preservada; no nueva política |
| 28 | PASS D4/D5/D8 y regresión v1–v5: v6 genuina demo+production ficticia, historia/REF/auditoría/intentos/acceso/DB-clave conservados; DDL rollback y versión desconocida intactos | Upgrade productivo solo después de guardas de par efectivo; ninguna migración operativa |
| 29 | PASS D4 y restore navegador: age real, manifiesto7/e1.6-v7/origen, capital/posiciones/IDs/MFA recuperados, sesiones e intentos revocados | Destino nuevo ficticio; sin copia externa, scheduler ni RPO/RTO |
| 30 | PASS suite íntegra97 tests/1557 assertions bajo umask022 tras corregir fixture; Playwright2 tests vigente para producto; matriz de cuatro Tipos, cuota Gasto íntegro y extraordinaria excluida | Transferencias con Exterior, E3/E2/E4 no habilitados |
| 31 | Contrato E2/E4 revisado, NO implementado/probado | Plan mensual/anual, flujo e informes posteriores |
| 32 | Contrato E4 revisado, NO implementado/probado | Deuda completa, historia/importación real y equivalencia |
| 33 | Contrato P5/DT5 revisado, NO implementado/probado | Cierres/fotos/guardas transversales futuras |

## Evidencia ejecutada por candidato

- Backend y UI principal **3239c2d1da9e0633acb4266b5df771b92630814e**: `bun run test` **97 PASS / 0 FAIL / 1547 assertions**,24.35s. Incluye D1–D10 (10/166), suites financieras, apertura SQLite y guardas/producción/restore. No se suman ejecuciones separadas para fingir suite.
- Mismo código: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bun run test:e2e` **2 PASS**,47.0s. Recorrido normal con Effect/SQLite reales, contraseña/TOTP y restore aislado; ningún bypass MFA ni fixture HTTP para éxitos financieros.
- Incremento auditoría **f2bfc1b0b3e0b86ae4232d3ee30d896f8b47b6f0**: dos archivos UI/test; añade filas capital/intereses al resumen antes/después. Typecheck PASS; recorrido afectado `bun run test:e2e -- tests/e2e/movimientos.spec.ts` **1 PASS**,28.1s. Abre historial y comprueba capital80/intereses20 visibles. Backend idéntico; no se repite la suite API sin necesidad.
- `bun run typecheck`, `bun run build`, `check-project`, `check-repository`, `validate-template`, `test-validator`18, `test-checks`22, `git diff --check`: PASS. Tooling Bun1.4.3, age1.3.2, Chromium del sistema.
- QA independiente sobre3239c2d informó10/166 Deudas y9/67 guardas productivas PASS, cuatro hallazgos iniciales corregidos y sin nuevos bloqueantes; retorno conciliado por coordinador. QA cerró además la revisión incremental f2bfc1b sin bloqueantes y contrastó su E2E afectado1 PASS. CI del SHA final pendiente.

## Navegador y revisión visual

Capturas ficticias `artifacts/e1-6/`: vacío, formulario/ficha/listado Deuda, cuota, preview, capital y movimientos filtrados a390/1440. Inspeccionadas personalmente `quota-preview-mobile.png`, `capital-desktop.png` y `debt-list-mobile.png`: sin overflow, capital720 separado de banco/Gasto y alcance temporal claro. QA inspeccionó además movimientos filtrados móvil. No factores, DB, claves, storageState ni trazas en artefactos.

Mejoras justificadas aplicadas dentro del diseño: separación20px entre paneles heredada, definiciones alineadas/valores tabulares y fecha civil dd/mm/aaaa. No hay cinco cambios visuales necesarios; se conserva jerarquía/tokens aprobados. Navegador verifica foco con teclado y colores calculados reales: texto rgb(36,50,14) sobre rgb(141,187,46), contraste6.04:1; texto general heredado rgb(43,43,43) sobre blanco14.16:1. No excepciones nuevas de accesibilidad.

## Fallos conservados y correcciones

- Primer ensayo de migración rechazó trigger externo referencia_used_type durante rebuild; corregido preservándolo dentro de la misma transacción. Primer Referencias9 PASS/2 FAIL restantes por nuevas columnas/versiones; expectativas estructurales actualizadas sin relajar reglas.
- Primera suite en sandbox:77 PASS/13 FAIL; errores EPERM de pipes/procesos y expectativas antiguas. Ejecución con permisos de entorno necesarios, mismos comandos/aserciones:87 PASS/3 FAIL, restantes rutas de copias v6→v7 desactualizadas. Corregidas manteniendo comparación exacta de datos heredados. Suite intermedia96/1537 PASS; D10 y revocación debt_attempts añadidos después, seguidos de suite final97/1547 PASS.
- QA inicial67f2dbd identificó cuatro defectos: payload null de extraordinaria, exceso precontrol con apertura negativa, falta de upgrade productionv6 y filtro Deuda UI no conectado. Todos corregidos y probados; no se atribuye PASS al candidato inicial.
- E2E primer run: catálogoPASS/financieroFAIL por helper ruta Partida /nueva (real /nuevo). Segundo: helper botón Guardar (real Crear Partida). Corregidos sin aumentar timeout ni cambiar contrato; financiero posteriorPASS28.0s, suite final2PASS47.0s, auditoría posterior1PASS28.1s. No son reintentos a ciegas.
- Suites multiproceso/servidores requieren permisos de entorno `with_additional_permissions` (`network.enabled=true`); evita EPERM del sandbox y conserva comandos/aserciones. Logs locales en work/ no se publican.

## CI PR #34 y corrección de fixture privada — 2026-10-22

- [CI push39752272341](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/39752272341) sobre **5c1e4f08fe2cf660c158c966bec5290902cd2655**: **FAILURE**, API96 PASS/1 FAIL exclusivamente D4; rechazo `privateSidecars → privateFile`, archivo no0600 al abrir producción. Este fallo permanece registrado; no se atribuye a AC-22/Dev32 ni se borra por resultados locales previos.
- Reproducción local explícita: `umask 022 && NODE_ENV=test bun test apps/api/src/deudas.test.ts -t '06 D4'` antes del cambio: **0 PASS/1 FAIL/37 assertions**, mismo rechazo en apertura productiva. El builder ficticio v6 creaba DB0644 y SQLite heredaba ese modo en WAL/SHM; el chmod posterior de DB no cambiaba los sidecars ya creados. Con umask077 local anterior la fixture había quedado privada, de ahí la diferencia de entorno.
- Corrección limitada al helper de fixture `apps/api/test-support/database-v6.ts`: crear DB/esquema bajo máscara077 desde la primera apertura, restaurando siempre la máscara del llamador en finally. D4 ya no repara permisos de DB a posteriori: exige DB/WAL/SHM0600 antes de abrir producción. El producto y sus guardas permanecen idénticos.
- Negativo conservado/reforzado: D4 cambia deliberadamente solo su WAL ficticio a0644 y comprueba rechazo antes de migrar, snapshot completo/identidad/clave sin cambios; restaura únicamente ese permiso de fixture a0600 para continuar la verificación positiva del upgrade/restore. No se relajan guardas, timeouts ni aserciones.
- Después: mismo D4 bajo umask022 **1 PASS/0 FAIL/84 assertions**. Suite íntegra `umask 022 && bun run test`: **97 PASS/0 FAIL/1557 assertions**,24.25s. Typecheck PASS. Bun1.4.3 y age1.3.2; permisos de ejecución de entorno iguales a los anteriores.
- No se repite Playwright: estos dos cambios afectan exclusivamente construcción/asserts de fixtures API; código de producto y recorrido de navegador siguen en f2bfc1b, con evidencia válida anterior. Revisión independiente de esta corrección y nueva CI por SHA a conciliar por coordinador; sin rerun manual de CI.

## Límites y siguiente gate

QA del producto completada sin bloqueantes; revisión de corrección de fixture/CI por SHA y autorización de merge pendientes. No Dev32, investigación AC-22 de infraestructura, VPS, deploy, datos reales, migración operativa, E2/E3/E4 ni cierre financiero ejecutados. R6/IOERR/API históricos no se declaran resueltos. Excel sigue fuente de verdad hasta el traspaso autorizado.

## CI e integración finales verificadas — 2026-10-22
SHA81ca2cdd: push39753174309 y PR39753182014 COMPLETED/SUCCESS.
PR34 integrada por permiso del usuario, squash cb9ba3b. No se borran fallos previos
ni se atribuye este resultado a AC futuros. CI posterior de main se consulta por
SHA integrado; el merge no ejecuta despliegue ni migración operativa.
