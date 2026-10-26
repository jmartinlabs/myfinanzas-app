# E3.3 — Vehículos y control ITV: testplan DEV15

Candidato autorizado: spec15 rev5 (`15c2ff1`), base `e408b1d`.
Entorno local: macOS, Bun 1.4.3, Python 3.12, Chromium/Playwright 1.64.1.
Los datos son ficticios. Un resultado macOS no sustituye CI Linux.

## Estrategia

- **API/SQLite**: `apps/api/src/vehiculos.test.ts`, con base `:memory:` y fixtures
  reales del servicio; migración v13→v14 y backup/restore focal.
- **Read model**: pruebas unitarias de agregación E2.4 con `AnnualProvider` inyectado
  (control/corte/cobertura verificable, parcial y futura) y pruebas HTTP autenticadas.
- **UI**: `tests/e2e/vehiculos.spec.ts` contra servidor ficticio aislado en 3009,
  MFA real, capturas 1440/390 y revisión de foco/teclado/contraste.
- **Verificación canónica**: `python3 scripts/verify --base e408b1d --head <SHA>`.
- Se registran PASS/FAIL/UNRUN/BLOCKED con comando, entorno y SHA. No se declara PASS
  por inspección ni se reutiliza evidencia de otro candidato.

## Matriz AC → escenario → comando → evidencia

| AC | Escenario principal (positivo/negativo) | Comando/archivo | Evidencia |
| --- | --- | --- | --- |
| AC-01 | Alta Vehículo crea REF + ficha 1:1; tipo y estado; identidad estable | `bun test apps/api/src/vehiculos.test.ts` | test API + inspección SQL |
| AC-02 | Fallo inyectado en ficha revierte REF; reintento idempotente no duplica | `vehiculos.test.ts` | test rollback/idempotencia |
| AC-03 | Ficha para Viaje o `vehiculo` con Tipo no Vehículo rechazada | `vehiculos.test.ts` | 422/rollback |
| AC-04 | Segunda ficha misma REF y dos procesos; PK/trigger sin estado parcial | `vehiculos.test.ts` | test concurrencia/SQLite |
| AC-05 | Conversión REF sin ficha/hechos crea ficha atómicamente | `vehiculos.test.ts` | test API |
| AC-06 | REF con ficha o usada no cambia Tipo; historia intacta | `vehiculos.test.ts` | 409 + auditoría |
| AC-07 | 404 solo REF inexistente/no-Vehículo sin ficha; 200 Revisar en anomalías | `vehiculos.test.ts` | tabla F3 |
| AC-08 | Renombrar conserva REF/enlaces/historia y Gasto año | `vehiculos.test.ts` | test+SQL |
| AC-09 | Matrícula opcional, limpiar, sin unicidad, auditoría | `vehiculos.test.ts` | test API |
| AC-10 | Coincidencias nombre/matrícula devuelven 409 con hashes separados sin escribir | `vehiculos.test.ts` | test API |
| AC-11 | Confirmación incompleta/ambas/contexto cambiado: 422/409 y atomicidad | `vehiculos.test.ts` | test API |
| AC-12 | Desactivar/reactivar conserva ficha/historia y bloquea nuevos enlaces | `vehiculos.test.ts` | test API/Movimientos |
| AC-13 | Sin ITV/cita = No informada; informar una sola es independiente | `vehiculos.test.ts` | DTO null |
| AC-14 | Fechas pasadas/futuras, limpiar/omitir, sin periodicidad | `vehiculos.test.ts` | test PATCH/audit |
| AC-15 | Gastos dentro/fuera de control/corte por Partida, sin doble cómputo | `vehiculos.test.ts` | agregado AC-41 |
| AC-16 | Otra REF, Ingresos, Transferencias, Amortizaciones, anulados no cuentan | `vehiculos.test.ts` | fixture ledger |
| AC-17 | Fecha real de diciembre con Ciclo enero; ITV no mueve gasto | `vehiculos.test.ts` | DTO año |
| AC-18 | Selector de ejercicio recalcula solo el año; inicial actual | E2E + API | captura/estado |
| AC-19 | Cobertura parcial: subtotal, motivo, totales null, cero false | `vehiculos.test.ts` | DTO |
| AC-20 | Verificable año abierto: total al corte, anual null | `vehiculos.test.ts` | DTO |
| AC-21 | Verificable hasta 31/12: anual completa = total al corte | `vehiculos.test.ts` | DTO |
| AC-22 | Cero verificado vs año futuro null/false | `vehiculos.test.ts` | DTO |
| AC-23 | Rectificar/anular recalcula una vez y conserva original | `vehiculos.test.ts` | ledger/audit |
| AC-24 | Renombrar/desactivar conserva históricos | `vehiculos.test.ts` | DTO años |
| AC-25 | Solo Movimientos; sin tabla de totales/hechos duplicados | `vehiculos.test.ts` | inspección sqlite_master |
| AC-26 | Sin sesión/CSRF/Origin, revisión obsoleta, payload inválido, replay, DELETE | `vehiculos.test.ts` | HTTP 401/403/409/422/404 |
| AC-27 | Respuesta antigua no reemplaza selección; borrador/filtros | E2E | prueba de carrera UI |
| AC-28 | UI 390/1440 listado, ficha, alta, edición, integridad, cobertura, conversión | `tests/e2e/vehiculos.spec.ts` | capturas + inspección |
| AC-29 | Vacío/carga/error/Revisar/reintento; identidad conservada si falla anual | E2E + API | capturas/DTO |
| AC-30 | Viaje/Evento sin ficha; CAT009 sin REF válido | `vehiculos.test.ts` | test transición |
| AC-31 | POST/PATCH atómicos; validateReference exige ficha; ledger reutilizado | `vehiculos.test.ts` | HTTP+SQL |
| AC-32 | Sin Base B/D5/Comida/B3, maestro alternativo, hechos duplicados, Navidad | Inspección + tests | rutas/tablas |
| AC-33 | Auditoría de ficha/REF con actor, UTC, antes/después, append-only | `vehiculos.test.ts` | audit rows |
| AC-34 | La ficha no edita Gastos/importes; solo enlaces | E2E/API | ausencia de endpoint/campos |
| AC-35 | W1–W10 presentes en 390/1440 con estados/candidatos | E2E | capturas |
| AC-36 | Matrícula igual no avisa; otra ficha 409; confirmada conserva ID/historia | `vehiculos.test.ts` | test API |
| AC-37 | Hash ausente/inválido/otro contexto por dimensión; NULL/vacío sin candidatos | `vehiculos.test.ts` | 422/409 |
| AC-38 | Transición E1.5: Vehículo operativo, Navidad bloqueada, CAT009 sin REF | `vehiculos.test.ts` | test API |
| AC-39 | Contrato E2.4 completo; subtotal suma filas; total anual solo completas | `vehiculos.test.ts` | agregado |
| AC-40 | Referencias → conversión → edición; usada/con ficha bloqueada | E2E + API | capturas/DTO |
| AC-41 | Caso mixto 120/400/720 + 50 fuera; sin hechos verificable/parcial | `vehiculos.test.ts` | DTO exacto |
| AC-42 | Solo nombre, solo matrícula, ambas; propia REF; duplicados permitidos | `vehiculos.test.ts` | test API |
| AC-43 | PATCH omitido/null/vacío/vehiculo:null/estado; acciones canónicas | `vehiculos.test.ts` | 422/200 |
| AC-44 | Año inicial solo vista; futuro Futura/null/false; sin reloj para atribuir | `vehiculos.test.ts` + E2E | DTO |
| AC-45 | Contraste oscuro #24320E sobre #8DBB2E, ~6,04:1; sin blanco | E2E | CSS computado |

## Registro de ejecuciones

Candidato funcional local (commits `96c3ac5` + `5f4403a`, base `e408b1d`). macOS
arm64, Bun 1.4.3, Python 3.12, Chromium/Playwright 1.64.1, `TMPDIR=/private/tmp` y
age 1.2.1 local. La QA independiente revisará el SHA final, no este resumen.

| Comprobación | Comando | Resultado |
| --- | --- | --- |
| Tipos | `bun run typecheck` | PASS |
| Build | `bun run build` | PASS |
| Focal API | `NODE_ENV=test bun test apps/api/src/vehiculos.test.ts` | 10 PASS / 150 assertions |
| API completa | `NODE_ENV=test bun test apps/api` | 177 PASS / 43 FAIL; los 43 son guardas Linux/restore (`libc.so.6`) en macOS, no fallos funcionales del candidato |
| E2E vehículos | `bunx playwright test tests/e2e/vehiculos.spec.ts` | PASS; capturas en `artifacts/e3-3/` |
| E2E completo | `bunx playwright test` | 6 PASS / 2 FAIL; catalog/movimientos fallan al arrancar servidores de restauración aislada en macOS; vehículos PASS |
| Referencias heredadas | `NODE_ENV=test bun test apps/api/src/referencias.test.ts` | 9 PASS / 2 FAIL; solo guardas Linux de backup/restore |
| Verificación canónica | `python3 scripts/verify ...` | Pendiente de commit/QA |
| QA independiente | Revisión de SHA final | Pendiente |

Los fallos de plataforma se conservan como UNRUN/BLOCKED para Linux/CI; no se
reclasifican como PASS. Las capturas son ficticias y no contienen bases, claves,
factores ni trazas.
