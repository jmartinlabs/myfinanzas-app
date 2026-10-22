# 07 — E2.1 Operación de Ciclos: Test plan

2026-10-22. Implementación autorizada, specification integrada PR37/c04dc07.
**Verificación global BLOQUEADA** por el fallo de apertura concurrente heredada
registrado abajo; no se declara entrega publicable. Resultados locales, sin CI remota.
E2.1-AC2 pendiente hasta Comida E3.5; AC27–29 no son pruebas actuales aprobadas.

## Evidencia reproducible

Toolchain: Bun1.4.3, age1.3.2, Chromium del entorno, datos íntegramente ficticios.
`bun run typecheck` PASS; `bun run build` PASS. Suite específica
`NODE_ENV=test bun test apps/api/src/cycle-operations.test.ts`: O1–O9 PASS,
171 assertions antes del ajuste exclusivamente instrumental de limpieza de procesos;
las nueve también PASS dentro de la suite completa posterior.

`bun run test`: **105 PASS / 1 FAIL**, 106 tests/1713 assertions/25,80s.
Log local no publicado `work/api-final.log`, líneas125–147: escenario heredado
`04 AC22/23/28: dos procesos actualizan v3, reintentan alta y compiten en rectificación`.
Diagnóstico: operación `upgrade`, fase `open`, `SQLiteError`, code `UNCLASSIFIED`,
errno11, localización `database-identity.ts:13:6`; proceso hijo exit1.
Una única comprobación afectada posterior, `NODE_ENV=test bun test apps/api/src/movimientos.test.ts`,
12 PASS/270 assertions/2,53s (`work/movimientos-repeat.log`), **no cierra el FAIL**.
Coordinador realiza contraste acotado contra base c04dc07. Sin reparación de apertura
ni investigación/reanudación Dev32. Verificación global pendiente de resolución.

Regresión enfocada anterior de cuatro módulos:41 PASS/862 assertions
(`work/structural.log`); no equivale a suite íntegra.
Primer intento completo:94 PASS/6 FAIL por expectativas técnicas de esquema7
tras upgrade8 y consulta legado sin columna revision; corregidos sin cambiar importes,
fechas ni reglas. Primeras fixtures O4 fallaron por columnas de catálogo y banco
inexistente en producción: corregidas creando datos ficticios mediante servicios reales.
Primer O2 usó por error una fecha de mes duplicado para comprobar salto de vecino;
se corrigió el dato del test conservando ambas validaciones.

`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bun run test:e2e`:
**2 PASS/47,6s**, catálogo17,6s y financiero27,5s (`work/e2e-final.log`).
Incluye recorridos previos E1.1–E1.6 y E2.1 con restore age, re-enrolamiento MFA,
lectura de Deuda/posición y recuperación de maestro/historial E2.1. Primera pasada
financiera enfocada:1 PASS/30,5s (`work/e2e-first.log`), luego repetida por mejoras
en detalle de intervalos, limpieza de procesos y comprobación real de teclado/contraste.
Sin traces, storageState ni factores en artifacts. Logs privados en work no publicados.

## Matriz de los 26 criterios actuales

O1–O9: `apps/api/src/cycle-operations.test.ts`. C03: `apps/api/src/ciclos.test.ts`.
E07: `tests/e2e/cycle-operations.ts`, ejecutado desde movimientos.spec.ts.
Cada PASS es evidencia del caso indicado; el FAIL global mantiene el gate abierto.

| AC | Acción y resultado comprobado | Evidencia | Resultado local |
| --- | --- | --- | --- |
| 01 | Alta ordinaria posterior conserva contrato y deriva Fin sin cierre ni ingreso | C03 alta; E07 alta futura real para invalidar contexto | PASS |
| 02 | Omitido anterior/intermedio, ID estable, vecinos y mes derivados | O1/O9; E07 omitido antes del primero | PASS |
| 03 | Motivo vacío rechazado sin escritura, contrato ordinario conservado | O2/O9; E07 error real422 | PASS |
| 04 | Fecha/mes duplicado/inválido no consume ID, borrador preservado | O2/O9; E07 validación y borrador | PASS |
| 05 | Rectificar dentro vecinos conserva ID y hechos | O1/O8; E07 | PASS |
| 06 | Saltar vecino o duplicar mes no escribe | O2 | PASS |
| 07 | Incluye desde Sin ciclo, anulados y cambio periodo del mismo ID, antes/después completos | O1/O8; E07 y capturas intervalos por hecho | PASS |
| 08 | 107 hechos, páginas100/7, huella y maestro completos | O3; C03 paginación | PASS |
| 09 | Resultado coincide con revisión; IDs/fechas/importes/auditorías originales idénticos | O1/O4; E07 compara hechos y auditorías originales | PASS |
| 10 | Cero/negativo exactos; ausente/null/número/tercer decimal rechazados | O1/O9; E07 negativo y cero | PASS |
| 11 | No propaga saldo Comida al siguiente ni cambia banco | O1; E07 siguiente e invariancia | PASS |
| 12 | Conciliación no disponible y motivo explícito, sin comparar cero | O9; E07 ficha/revisión | PASS |
| 13 | Vacío/anterior primero/futuro y error fuente instalado siguen contrato común E1.3 | O1/O9; C03 referencia/fuente error; E07 cabecera | PASS |
| 14 | Inicio−1/Inicio/Fin/siguiente, ejercicio, bisiesto/DST civiles | C03 calendario y procesos TZ; O1 | PASS |
| 15 | Intervalo temporal derivado, sin cierre/foto ni motor nuevo | O1/O9; E07 textos y facts invariables | PASS |
| 16 | Actual consultado cambia con Inicio; referencia y posiciones/capital permanecen | O1/O4; E07 antes/después | PASS |
| 17 | Cambiar revisión de hecho/maestro invalida preview409; borrador se conserva | O2/O7; E07 cambia maestro entre preview/confirmación | PASS |
| 18 | Dos procesos reales con barrera: una escritura/un conflicto, sin duplicados | O7 (v7→8 y confirmación concurrente) | PASS |
| 19 | Mismo intento reproduce resultado; payload distinto conflictúa; respuesta perdida no duplica | O2/O8; E07 corta respuesta tras write real | PASS |
| 20 | Fallo audit/intento revierte maestro/revisión/counter/audit/intento/guard | O2/O9, snapshot íntegro y siguienteID2 | PASS |
| 21 | Historial actor/UTC/motivo/antes/después; derivados incluso replay y DELETE rechazados | O6/O8/O9; E07 historial real | PASS |
| 22 | Sin MFA401, sin Origin/CSRF403; contrato de errores técnicos heredado preservado | O6; suite de seguridad existente; E07 fallo503 de presentación | PASS |
| 23 | Fixture v7 genuina demo/producción privada con Deuda/hechos/audit/MFA; DDL rollback, desconocido intacto, dos upgrades | O4/O5/O7 PASS; apertura concurrente v3 heredada FAIL en suite global | **BLOQUEADO gate regresión** |
| 24 | age/manifiesto8/origen, restore aislado recupera hechos/historial y revoca sesiones/intentos | O4; E07 restore+MFA heredado | PASS |
| 25 | Flujos reales390/1440, sin overflow, teclado/foco/contraste y capturas inspeccionadas | E07; inspección descrita abajo | PASS |
| 26 | Vacío/carga/error/401/404/409/422 y borrador diferenciados | O6/O9; C03 HTTP; E07 carga/error503/422/409/retorno y vacío de afectados | PASS |

## Inspección visual y accesibilidad

Capturas ficticias locales `artifacts/e2-1/*.png`: listado, ficha, formulario,
impacto, error, carga, historial y omitido. Impacto e historial/formulario a390/1440
inspeccionados. Sin overflow; paneles, motivo, confirmación y pendiente Comida legibles.
Tab desde Volver al borrador alcanza Confirmar; foco del motivo y revisión automático
comprobados; foco visible heredado. Color calculado real de Confirmar:
texto rgb(36,50,14) sobre rgb(141,187,46), contraste6,04:1 (sin cambio de tokens).
No se usa solo color para errores/pendientes/vigencia.

Tres mejoras justificadas dentro del diseño aprobado: separación de paneles para
jerarquía, tarjetas de hechos que ajustan líneas en móvil, y periodos antes/después
por hecho para hacer visible un cambio conservando ID. Se reejecutó Playwright tras
aplicarlas. No se justifican dos cambios adicionales solo para alcanzar cinco;
se conserva diseño común, incluido control date nativo dependiente del navegador.

## Contratos futuros revisados, no implementados ni probados

| AC | Dependencia | Estado |
| --- | --- | --- |
| 27 C | Cierre real Comida E3.5 y aviso apertura distinta | PENDING; E2.1-AC2 NO verificado |
| 28 C | Fuentes reales Comida/inversión y cobertura común | PENDING integración E3/E4; pruebas de contrato temporal no equivalen a motores reales |
| 29 C | Cierres/protecciones transversales DT5/P5/E4 | PENDING; sin cierres ni fotos ficticias |

QA independiente revisa SHA fijo y probes aislados; coordinador consolida dictamen
y evidencia de CI sobre el candidato final. Sin merge autorizado.
