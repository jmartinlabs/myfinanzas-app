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

Candidato P2 local `8c8f064` (base `e408b1d`). macOS
arm64, Bun 1.4.3, Python 3.12, Chromium/Playwright 1.64.1, `TMPDIR=/private/tmp` y
age 1.2.1 local. La QA independiente revisó el SHA final, no este resumen.

| Comprobación | Comando | Resultado |
| --- | --- | --- |
| Tipos | `bun run typecheck` | PASS |
| Build | `bun run build` | PASS |
| Focal API | `NODE_ENV=test bun test apps/api/src/vehiculos.test.ts apps/api/src/vehiculos-concurrency.test.ts` | 12 PASS / 179 assertions: Anticipo + alta concurrente |
| API completa | `NODE_ENV=test bun test apps/api` | QA 177 PASS / 46 FAIL; full final 179 PASS / 44 FAIL / 223 tests; diferencia por flakes R11/04; guardas Linux/restore y backup v14 UNRUN; sin fallo funcional nuevo |
| E2E vehículos | `bunx playwright test tests/e2e/vehiculos.spec.ts tests/e2e/vehiculos-empty.spec.ts` | 2 PASS; listado, ficha, Anticipo, vacío/carga y Gastos del año visibles a 390/1440; capturas en `artifacts/e3-3/` |
| E2E completo | `bunx playwright test` | 6 PASS / 2 FAIL; catalog/movimientos fallan al arrancar servidores de restauración aislada en macOS; vehículos PASS |
| Referencias heredadas | `NODE_ENV=test bun test apps/api/src/referencias.test.ts` | 9 PASS / 2 FAIL; solo guardas Linux de backup/restore |
| Baseline canónica | `python3 scripts/verify baseline` | PASS en `1ef3f62` |
| Full canónica | `python3 scripts/verify --full` | Baseline PASS; typecheck/build PASS; API 179 PASS/44 FAIL por guardas Linux; E2E UNRUN. No es PASS |
| Backup/restore v14 | `bun test apps/api/src/vehiculos-backup.test.ts` | UNRUN en macOS (`libc.so.6`); debe ejecutarse en Linux/CI |
| QA independiente | Revisión de `8c8f064` | APTO CON OBSERVACIONES; P2 de Gastos móvil cerrado, 45/45 AC locales, residuales menores y Linux/CI UNRUN |

Los fallos de plataforma se conservan como UNRUN/BLOCKED para Linux/CI; no se
reclasifican como PASS. Las capturas son ficticias y no contienen bases, claves,
factores ni trazas.


## Estado por AC tras QA y correcciones

**45/45 AC con PASS local; AC-04 y AC-29 completos; 0 FAIL funcionales.** `PASS` local no implica CI Linux ni aprobación de merge.
Los límites se conservan explícitos.

| AC | Estado | Evidencia principal |
| --- | --- | --- |
| AC-01 | PASS | API focal + alta 1:1 |
| AC-02 | PASS | rollback forzado + idempotencia |
| AC-03 | PASS | Type/ficha cruzados |
| AC-04 | PASS | alta concurrente 2 procesos + carrera de segunda ficha con PK verificada |
| AC-05 | PASS | conversión Q3 |
| AC-06 | PASS | Tipo con ficha/usado bloqueado |
| AC-07 | PASS | 404/200 Revisar sin reparación |
| AC-08 | PASS | renombrado conserva ID/histórico |
| AC-09 | PASS | matrícula nullable/limpieza |
| AC-10 | PASS | aviso dos dimensiones |
| AC-11 | PASS | 422/409 atómicos |
| AC-12 | PASS | desactivar/reactivar |
| AC-13 | PASS | fechas ausentes independientes |
| AC-14 | PASS | pasadas/futuras/null/omitido |
| AC-15 | PASS | dentro/fuera de control |
| AC-16 | PASS | Ingreso/Transferencia/Amortización/anulados excluidos |
| AC-17 | PASS | Fecha real diciembre/ITV |
| AC-18 | PASS | selector UI/API |
| AC-19 | PASS | parcial/null/false |
| AC-20 | PASS | abierta/total al corte |
| AC-21 | PASS | completa/total anual |
| AC-22 | PASS | cero verificado vs futuro |
| AC-23 | PASS | rectificar/anular una vez |
| AC-24 | PASS | renombrar/desactivar histórico |
| AC-25 | PASS | sin tabla de totales |
| AC-26 | PASS | MFA/CSRF/Origin/replay/DELETE |
| AC-27 | PASS | respuesta antigua no sustituye |
| AC-28 | PASS | E2E 390/1440 + capturas |
| AC-29 | PASS | E2E real de carga/vacío sin filas ni importes + error/retry e integridad |
| AC-30 | PASS | Viaje/Evento y CAT009 sin REF |
| AC-31 | PASS | POST/PATCH/validateReference/ledger |
| AC-32 | PASS | alcance sin módulos ajenos |
| AC-33 | PASS | auditoría append-only y duplicado ligado a REF |
| AC-34 | PASS | sin edición de Gastos/importes |
| AC-35 | PASS | W1–W10 y captura de conversión |
| AC-36 | PASS | corrección de matrícula |
| AC-37 | PASS | hash/contexto/NULL |
| AC-38 | PASS | transición E1.5 |
| AC-39 | PASS | contrato E2.4 completo |
| AC-40 | PASS | conversión UI/API |
| AC-41 | PASS | caso exacto 1240/50 |
| AC-42 | PASS | dimensiones/ propia REF |
| AC-43 | PASS | PATCH omitido/null/estado |
| AC-44 | PASS | futuro Futura/null/false |
| AC-45 | PASS | contraste computado 6,04:1 |


## Residuales de QA final (`90c28a7`)

- R-02 (baja): `duplicado_confirmado` declara entidad `ficha_vehiculo` pero usa la
  revisión de la REF; queda documentado, sin pérdida de datos ni bloqueo.
- R-03 (baja): «Ver procedencia» permanece inline y `Movimientos.tsx` no pinta el DTO
  `integridad`; la API y la página de integridad son correctas.
- R-04 (baja): los recuentos son 177/46/223 en la QA final; pueden variar por flakes
  preexistentes R11/04 y por `vehiculos-backup.test.ts`, UNRUN en macOS.
- R-06: cerrado; la carrera de segunda ficha exige el motivo `UNIQUE constraint failed:
  fichas_vehiculo.referencia`, no un rechazo genérico.
- Gates pendientes: CI Linux real, `scripts/verify --full` PASS, revisión/publicación
  autorizada de PR y aprobación de merge. Nada de esto se declara.

## Revisión externa del defecto de Anticipo

La revisión del usuario reprodujo una conversión inválida: Anticipo sin movimientos →
Vehículo conservando `fichas_anticipos` y creando `fichas_vehiculo`. La regresión nueva
`AC-06/40` cubre GET del indicador, PATCH 409 `HISTORY_LOCKED`, conservación de Tipo y
ficha de Anticipo, ausencia de ficha de Vehículo y ausencia de auditoría de ficha. El
E2E comprueba que Referencias no ofrece el botón para el Anticipo. QA independiente
confirmó el cierre sobre `80c7848`, incluido el caso de Anticipo sin ficha histórica.
Linux/CI y backup/restore siguen UNRUN: no se declara PASS completo.

## AC-04 y AC-29: cobertura dinámica añadida

- `AC-04`: `apps/api/src/vehiculos-concurrency.test.ts` lanza dos procesos Bun
  independientes que crean Vehículos; verifica IDs distintos, dos REF, dos fichas,
  ausencia de huérfanas, FK, auditoría, contador y estado final. Después lanza dos
  procesos que intentan insertar la misma segunda ficha `REF900`: exactamente uno es
  aceptado y el otro rechazado por `UNIQUE constraint failed:
  fichas_vehiculo.referencia`; queda una sola ficha. Ejecutado 3 veces: 1 PASS/16
  assertions cada vez.
- `AC-29`: `tests/e2e/vehiculos-empty.spec.ts` arranca un servidor real sin vehículos,
  autentica con MFA, retiene la respuesta del listado y comprueba «Cargando
  vehículos…» sin tabla, tarjetas ni importes; al liberar aparece «Sin vehículos» sin
  filas ni importes, a 1440 y 390. Error/retry e integridad siguen cubiertos por el
  recorrido principal y las pruebas API.

Estas pruebas elevan el estado local a **45/45 AC**; no sustituyen Linux/CI ni el
backup/restore v14, que permanecen UNRUN.

## Regresión P2 — Gastos del año en móvil

Defecto Codex sobre `c69e343`: a 390 px `AnnualFacts` solo montaba `.desktop-list`,
oculta por CSS; no había fecha, concepto, Partida ni importe visibles.

Corrección `8c8f064`: tabla de escritorio intacta + `<ul class="mobile-list
vehicle-facts">` con el mismo `annual.gastos`, sin duplicar cálculos. La prueba E2E
comprueba a 390 px las 3 filas y la primera con `15/02/2026`, `Gasto ficticio
vehículo`, `PAR001 · Mantenimiento`, `120,00 €`; a 1440 px exige tabla visible,
móvil oculta y 3 filas. Capturas inspeccionadas: `vehiculos-detail-390.png` y
`vehiculos-detail-1440.png`.

La CI Linux de `c69e343` no acredita `8c8f064`. Resultado de CI del SHA nuevo:
pendiente de la ejecución de PR81; no se declara PASS hasta verificarla.
