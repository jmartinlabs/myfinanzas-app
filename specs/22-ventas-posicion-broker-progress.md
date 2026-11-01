# 22 — E4.2 Ventas, posición y efectivo de bróker: Progress

Status: **DEV22 implementado en la rama `dev22-ventas` (2026-11-01): venta, efectivo, posición,
API, UI y esquema v21. 41 AC con evidencia local; la fuente de inversión de la referencia
temporal queda implementada y probada, pero su conexión en `ciclos.ts` está bloqueada por
ownership. Backup/restore y E2E no verificados en macOS. Sin push, PR ni merge.**
Task ID: `SPEC22-E4.2` — Ventas, posición y efectivo de bróker.
Session: `ses_e814117d4ffeq7ykfa65veXcxv` (OpenCode desktop, cliente externo iniciado/parado
por el usuario; sin workers controlados).
Fecha: 2026-11-01 (checkpoint DEV22); historial documental del 2026-10-28.

## Checkpoint DEV22 — 2026-11-01

- **Autorización:** el usuario autorizó expresamente iniciar DEV22 el 2026-11-01 (paquete de
  trabajo DEV22/E4.2). Contrato: SPEC22 rev2 aprobada (D1–D7 = A), testplan aprobado y
  enmienda D7 de SPEC19 integrada en `main` `e6475e6`.
- **Base y aislamiento:** worktree exclusivo gestionado por OpenCode (`dev22-ventas`), rama
  `dev22-ventas` desde `main` `4eb7264`. Sin push, PR, merge, despliegue ni datos reales.
- **Gate de esquema (v20 → v21):** no había versión reservada por SPEC22 ni colisión; se adopta
  la siguiente versión libre (21) con `ventaSchema` (`apps/api/src/venta-schema.ts`), que
  reconstruye **solo** `operaciones_inversion` (CHECK `clase IN ('Compra','Venta')`) y su tabla
  de auditoría hija, preservando filas, auditoría, intentos, contadores, identidad y el resto de
  tablas. Se registra el contrato `C21-VENTAS-E42` (258 objetos, SHA-256
  `f8d327b77e8fdc58a3337e5a497bd61d48aae1b3470f79d38462236cd2326e4a`) en
  `schema-contracts.json`; C14–C20 permanecen congelados. `backup.ts` admite 21 con etiqueta
  `e4.2-v21` y restore vacía los mismos intentos. El detalle de la migración (no se puede
  desactivar `foreign_keys` dentro de la transacción de `prepareSchema`; el hijo FK se copia a
  una tabla de paso antes de reconstruir el padre) está documentado en el propio módulo.
- **Implementación:** `ventas.ts` (alta, impacto, rectificación con reemplazo completo,
  anulación, listado, ficha, auditoría), D1 (`INSUFFICIENT_UNITS` con ventana posterior y
  agregación de fin de día), D2 (`INSUFFICIENT_CASH` en correcciones/anulaciones), D3
  (Instrumento inactivo con cantidad, Saldo inactivo bloqueado), D7 (guard de cantidad al
  rectificar/anular Compras), motor único de efectivo con término `+ Ventas`, posición
  `saldo_inversion + instrumento` con conteos y fechas vigentes, opciones `instrumentosVenta`
  acotadas por Saldo, ficha con Compras y Ventas, y UI de Ventas (pestaña, listado, alta,
  impacto, rectificación, anulación) reutilizando el shell y los componentes de Inversiones.
- **Huella e impacto de Movimientos:** `financeRevision` ya incorporaba
  `operaciones_inversion` y el guard de Saldo ya consideraba esa tabla, por lo que una Venta
  invalida una previsualización de Movimiento (`409 IMPACT_CHANGED`) y un Saldo con Ventas queda
  protegido (`409 HISTORY_LOCKED`) sin reescribir esos módulos.
- **Referencia temporal:** `investmentSource` (`apps/api/src/investment-ledger.ts`) implementa
  la fuente de cuatro estados (pendiente / disponible / sin_referencia / error) con solo
  fechas vigentes y sin reloj. **No se conecta en `temporalSources` (`apps/api/src/ciclos.ts`)**
  porque ese archivo está fuera del ownership exclusivo del paquete y en su lista de
  prohibidos. Parche mínimo pendiente de autorización:
  `return financialReference([movementSource(db), revisionComidaSource(db), investmentSource(db)]);`
  (más el `import`). Mientras no se aplique, AC-20, AC-21 (integración), AC-22, AC-23 y AC-38
  quedan UNRUN en su parte de conexión; la fuente y el contrato puro sí están probados.
- **Cambios mecánicos fuera del ownership nominal:** el ascenso de versión obliga a actualizar
  expectativas de versión/etiqueta de backup en pruebas de otros dominios (`ciclos.test.ts`,
  `comida.test.ts`, `compartidos.test.ts`, `cycle-operations.test.ts`, `d5-aportaciones.test.ts`,
  `d5-backup.test.ts`, `deudas.test.ts`, `movimientos.test.ts`, `nomina.test.ts`,
  `plan-anual.test.ts`, `planes-ciclo.test.ts`, `production.test.ts`, `referencias.test.ts`,
  `revision-comida-backup.test.ts`, `revision-comida.test.ts`, `vehiculos-backup.test.ts`,
  `vehiculos.test.ts`, `sqlite-identity-concurrency.test.ts`, `presupuestos.test.ts`) y del gate
  (`schema-contract-v18.test.ts`). Solo cambian números de versión y etiquetas `e2.7-v20` →
  `e4.2-v21`; no se altera lógica de esos dominios. Requiere revisión del coordinador por
  ownership.
- **Pruebas focales:** `apps/api/src/ventas.test.ts` (21 pruebas, 148+ aserciones) cubre
  AC-01–AC-19, AC-24–AC-31, AC-34–AC-36, AC-39–AC-40, AC-42–AC-45 y la parte de fuente de
  AC-20–AC-23/38. Carrera real con dos procesos (`inversion-race-worker.ts`, acciones
  `create-venta`/`rectify-venta`).
- **Verificación local (macOS arm64, Bun 1.4.3):** `bun run test` → **365 pass / 56 fail**; los
  56 fallos son exactamente los mismos que la línea base `main` `4eb7264` (ancestros de
  directorios temporales/`renameat2`/symlinks Linux-only), no regresiones. `bun run typecheck`
  PASS y `bun run build` PASS.
- **No verificado:** Playwright/E2E 390/1440 (AC-19 UI, AC-27 aviso, AC-32, AC-33, AC-44 UI) y
  backup/restore real (AC-37: la prueba se amplió con una Venta y auditoría, pero en macOS falla
  por el entorno de directorios privados, igual que en la línea base). AC-41 (`flujo-mensual`)
  no se ejecutó de extremo a extremo; su ruta usa `getSaldo`→motor único ya probado en AC-16/17.

### Estado por AC (DEV22, 2026-11-01)

| AC | Estado | Evidencia |
| --- | --- | --- |
| E4.2-AC-01 | PASS | `ventas.test.ts` · Venta EUR, efectivo 1.810,40→2.360,40, 12,5→7,5, sin Movimiento |
| E4.2-AC-02 | PASS | Venta USD conserva cambio/importe; una operación posterior no recalcula |
| E4.2-AC-03 | PASS | Venta parcial: posición 7,5, compras=1, ventas=1, efectivo una vez |
| E4.2-AC-04 | PASS | Venta total: 0, compras=1/ventas=2, fechas, sin «Cerrada» ni valoración |
| E4.2-AC-05 (D1) | PASS | Casos (a)(b)(c)(d) con `disponible`/`necesario`/`minimo`/`fecha` exactos y sin escritura, ambos órdenes |
| E4.2-AC-06 | PASS | S004 y S006 independientes |
| E4.2-AC-07 | PASS | Comisión incluida; 506,00 exactos; comisión = importe aceptada |
| E4.2-AC-08 | PASS | Comisión > importe, negativa y 3 decimales → 422 |
| E4.2-AC-09 | PASS | Idempotencia, 409 de conflicto, dos Ventas del mismo día |
| E4.2-AC-10 | PASS | Impacto 2.316,40→2.113,40 y 7,5→9,5; referencia 303,60/−0,60; auditoría |
| E4.2-AC-11 | PASS | Revisión obsoleta 409; omisión/null/identidad 422 sin escritura |
| E4.2-AC-12 | PASS | Anulación conserva registro; efectivo 1.810,40; cantidad 12,5 |
| E4.2-AC-13 | PASS | Segunda anulación 422; revisión obsoleta 409; rectificar anulada 422 |
| E4.2-AC-14 | PASS | Identidad no rectificable; anular + nueva Venta sin vínculo persistido |
| E4.2-AC-15 | PASS | Sin Movimientos, Presupuesto, Partida, Referencia ni Deuda |
| E4.2-AC-16 | PASS | `/api/saldos/S003` y `/api/inversiones/efectivo` idénticos al céntimo; corte etiquetado |
| E4.2-AC-17 | PASS | S001 y número de Movimientos sin cambios |
| E4.2-AC-18 | PASS | Ficha con conteos 1/1→1/2 y S006 1/0; fechas correctas |
| E4.2-AC-19 | PASS (API) / UNRUN (UI) | Cobertura, «No disponible hasta E4.3» y ausencia de «Cerrada»; sin Playwright |
| E4.2-AC-20 | UNRUN | Fuente y contrato probados; conexión en `ciclos.ts` bloqueada por ownership |
| E4.2-AC-21 | UNRUN (integración) | Máximos del contrato puro PASS; agregación de tres fuentes no conectada |
| E4.2-AC-22 | UNRUN | Fuente retrocede al anular y avanza al rectificar (PASS); referencia global sin conectar |
| E4.2-AC-23 | UNRUN | Estados pendiente/error/sin_referencia de la fuente PASS; UI y consumidores sin conectar |
| E4.2-AC-24 | PASS | Futuro/inválida 422; bisiesto y `spanishToday` 23:30Z/00:30Z |
| E4.2-AC-25 | PASS | Escalas 8/6/6, límite 2⁵³−1 exacto, exceso 422, producto interno BigInt |
| E4.2-AC-26 | PASS | EUR null/1 válidos; 1,1 y USD inválidas; US/USDD/usd 422 |
| E4.2-AC-27 (D3) | PASS (API) / UNRUN (aviso UI) | Inactivo con cantidad aceptado; inactivo sin cantidad y Saldo inactivo rechazados; `instrumentosVenta` acotado |
| E4.2-AC-28 | PASS | Fallo inyectado: sin fila, contador ni auditoría |
| E4.2-AC-29 | PASS | Dos Ventas concurrentes: una válida y otra 422; dos rectificaciones: 409 |
| E4.2-AC-30 (D2) | PASS | 300,00/500,00/−200,00/11-04; baja −100,00; alza aceptada |
| E4.2-AC-31 | PASS | 401 sin sesión, 403 sin CSRF, 404 en DELETE sin escritura |
| E4.2-AC-32 | UNRUN | Sin Playwright/capturas de la implementación |
| E4.2-AC-33 | UNRUN | Sin Playwright; estados de API cubiertos por pruebas de dominio |
| E4.2-AC-34 | PASS | Auditoría por revisión, `clase`, actor, UTC, triggers que abortan UPDATE/DELETE |
| E4.2-AC-35 | PASS | 12,5→7,5→0→2, conteos 2/2, sin «Cerrada», efectivo una vez |
| E4.2-AC-36 | PASS | v21, una sola tabla, sin `ventas`, contrato C21, migración preserva filas/auditoría/contadores/identidad |
| E4.2-AC-37 | FAIL (entorno) / no verificado | Prueba ampliada con Venta; falla en macOS por ancestros privados, igual que la línea base |
| E4.2-AC-38 | UNRUN | Fecha común del contrato puro PASS; integración de fuentes sin conectar |
| E4.2-AC-39 | PASS | Cinco cambios 409 `HISTORY_LOCKED`; nombre permitido |
| E4.2-AC-40 | PASS | Venta entre preview y confirmación → 409 `IMPACT_CHANGED` |
| E4.2-AC-41 | UNRUN | No ejecutado de extremo a extremo; ruta `getSaldo`→motor único ya probada |
| E4.2-AC-42 | PASS | Impactos y GET no escriben: tablas, contadores, revisiones y auditoría iguales |
| E4.2-AC-43 | PASS | Cantidad/precio/importe inválidos, 2000/2001, clave inválida, diferencia informativa |
| E4.2-AC-44 | PASS (API) / UNRUN (UI) | Filtros, paginación, estados, 404, opciones acotadas; incidencia «Revisar» no ejecutada |
| E4.2-AC-45 (D7) | PASS | 7,5/12,5/−5/10-04; baja 422; P2 1/3/−2/12-04; sin Ventas no rechaza |

### Comandos ejecutados

| Comando | Resultado |
| --- | --- |
| `bun install --frozen-lockfile` | OK (dependencias instaladas en el worktree) |
| `NODE_ENV=test bun test apps/api/src/ventas.test.ts` | **21 pass / 0 fail** |
| `bun run test` | **365 pass / 56 fail** (los 56 son la línea base de macOS; sin regresiones) |
| `bun run typecheck` | PASS |
| `bun run build` | PASS (aviso de tamaño de chunk preexistente) |
| `python3.12 scripts/verify --base 4eb7264 --head <SHA>` | **FAIL** de la fase de aplicación por los 56 fallos de entorno macOS; baseline/gate PASS. Detalle abajo |

### Verificación canónica (`scripts/verify`, macOS arm64, Python 3.12.16)

`python3.12 scripts/verify --base 4eb7264 --head <cabeza de dev22-ventas>` clasificó `full` y
ejecutó: `check-repository` PASS, `check-project` PASS, `validate-template` PASS, `test-checks`
PASS, `test-validator` PASS, `test-agent-relay` PASS, `test-agent-usage` PASS,
`test-auto-agent-usage` PASS, `test-verification` PASS, `test-evidence` PASS,
`working-whitespace` PASS, `commit-whitespace` PASS, `typecheck` PASS, `build` PASS,
**`api` FAIL** (365 pass / 56 fail) y `e2e` UNRUN.

Los 56 fallos son idénticos, por nombre de prueba, a la línea base de `main` `4eb7264` en este
equipo: `Ancestro no confiable` en directorios temporales, `renameat2`/`libc.so.6` y enlaces de
`/var` propios de Linux. No se declaran PASS ni se ocultan; el candidato requiere el entorno
canónico Linux para la fase de aplicación y para E2E.

## Aprobación visual rev3 — 2026-10-28

- **Mensaje explícito del usuario:** «Apruebo la revisión visual rev3 de W2/W5 y W11–W16 de
  SPEC22, incluidos los estados y bloqueos D1/D2/D3.»
- **Alcance:** W2/W5, W11–W16, estados de vacío/carga/error/sesión, W15b de revisión obsoleta y
  bloqueos D1/D2/D3. La aprobación visual **no** autoriza DEV22, esquema, commits, push, PR ni
  merge.
- **Evidencia:** HTML rev3 (SHA-256 `d337644c…a664a4`), capturas rev3 y ZIP
  `specs/22-ventas-posicion-broker-captures/rev3/spec22-wireframes-rev3-review.zip`
  (SHA-256 `50153491…b3cd1f`); `overflow-report.json` 20/20 sin desbordamiento.
- **Retoques visuales menores:** el usuario los difiere al final del proyecto (2026-10-28); no
  bloquean la aprobación de la specification ni DEV22.
- **Pendiente:** coordinación D7/SPEC19 (enmienda mínima de SPEC19); E4.1 ya está integrada en
  `156a50d`. No se inicia DEV22.

## Aprobación de la specification completa — 2026-10-28

- **Mensaje explícito del usuario:** «Apruebo la specification completa de SPEC22.»
- **Objeto:** contenido de la specification en el candidato de PR #105, head `798e1e6`; este
  commit solo registra el estado aprobado.
- **Límite:** no autoriza DEV22, esquema, merge ni despliegue.

## Aprobación del testplan — 2026-10-28

- **Mensaje explícito del usuario:** «SPEC22 testplan apruebo.»
- **Objeto:** matriz de 45 AC en el candidato de PR #105; los 45 AC siguen **UNRUN** hasta que
  exista implementación y candidato autorizado.
- **Límite:** aprobación documental; no ejecuta pruebas ni autoriza DEV22, esquema o merge.

## Checkpoint documental — 2026-10-27

- **Alcance autorizado:** preparar SPEC22 (brainstorming, specification, wireframes, testplan y
  checkpoint) para E4.2. Por instrucción expresa del encargo: sin desarrollo, migraciones,
  pruebas funcionales, CI remoto, push, PR, merge, despliegue, infraestructura nueva, Excel ni
  datos reales.
- **Ownership:** solo documentos `specs/22-ventas-posicion-broker-*`. No se modifican SPEC19,
  SPEC20/DT7, SPEC21, INV-DT5, código, harness, workflows ni `specs/epic-board.md`.
- **Base y aislamiento:** los artefactos se prepararon en un worktree aislado sobre `064df64`, base
  histórica de E4.1 anterior a rev10. Para publicación se trasladan —solo documentos y
  wireframes— a la rama `codex/spec22-visual-rev3`, creada desde `main` `4edcfeb`; no se traslada
  código histórico ni se modifica E4.1. SPEC19 rev10 quedó integrada en `main` `156a50d`
  (registro original `3c271d3`).
- **Estado de E4.1:** contrato funcional rev7/rev8 aprobado; **SPEC19 rev10 y su testplan
  aprobados el 2026-10-27** e integrados en `main` `156a50d` (registro original `3c271d3`), con
  C16/C17 congelados y `schemaVersion = 18`; QA independiente PASS 48/6 y CI Linux 295 API /
  13 E2E. E4.2 no reserva versión de esquema.
- **Documentos creados:**
  - [brainstorming](22-ventas-posicion-broker-brainstorming.md)
  - [specification](22-ventas-posicion-broker-specification.md)
  - [testplan](22-ventas-posicion-broker-testplan.md)
  - [presentación visual de wireframes rev3](22-ventas-posicion-broker-wireframes.html)
  - [capturas rev3 y HTML para revisión externa](22-ventas-posicion-broker-captures/rev3/spec22-wireframes-rev3-review.zip)
  - este progress/checkpoint.

## Contenido y decisiones

- **Decisiones fijadas por fuentes:** Venta solo en el registro de inversión; EUR cobrado y
  cambio histórico; efectivo `apertura + entradas − salidas − Compras + Ventas`; cantidad
  `Compras − Ventas`; referencia temporal de tres fuentes; precisión DT2; rectificación y
  anulación de E4.1; valoración/resultado fuera de E4.2.
- **Decisiones confirmadas A (2026-10-27):** D1 cantidad insuficiente (422
  `INSUFFICIENT_UNITS`), D2 efectivo negativo en correcciones/anulaciones (422
  `INSUFFICIENT_CASH`), D3 Instrumento/Saldo inactivo, D4 pestaña Ventas, D5 posición a 0, D6
  operaciones anuladas fuera de la referencia y D7 Compra rectificada/anulada por debajo de la
  cantidad vendida (422 `INSUFFICIENT_UNITS`, coordinación/documentación previa de SPEC19).
- **Q0 resuelta:** SPEC19 rev10 y testplan aprobados el 2026-10-27 e integrados en `main`
  `156a50d` (registro original `3c271d3`, posterior a `27c8d07`); no se reabre ni se modifica
  SPEC19.
- **Trazabilidad:** 45 AC de diseño, con positivos, negativos, límites e integración; tabla
  roadmap E4.2-AC1/AC2/AC3 → AC → testplan.
- **Dependencias E4.3 identificadas, no especificadas:** cantidad/historial/importes, Estado
  Abierta/Cerrada, valoración manual/automática, resultado abierto/cerrado, agregados por Tipo
  saldo=Inversión, posible decisión de lotes/FIFO y cobertura parcial.

## Verificaciones documentales

| Comprobación | Comando / método | Estado |
| --- | --- | --- |
| Enlaces y estructura | `python3 scripts/validate-template` | **PASS** — «Template validation passed» (macOS, Python 3.9.6, base `main` `4edcfeb`, candidate sin commitear; wireframes y ZIP versionados) |
| Regresiones del validador | `python3.12 scripts/test-validator` | **PASS** — 26 tests OK |
| Whitespace/diff | `git diff --check` | **PASS** — exit 0 |
| Verificación canónica local | `python3.12 scripts/verify baseline` (cliente externo) | **PASS reportado** — baseline phase PASS; application phase no incluida; 15 tests de verificación OK. **No reejecutado en esta publicación**: el entorno local solo tiene Python 3.9.6 y el script exige 3.10+ (UNRUN, no FAIL) |
| Revisión independiente | Tres revisores en contexto separado, solo lectura | **PASS final** — primera CHANGES (19), segunda CHANGES (2 mayores + 7 menores), tercera **PASS** (6 menores editoriales); correcciones aplicadas. Rev2 confirma A las recomendaciones ya revisadas y añade la presentación visual; no cambia reglas materiales |
| Presentación visual W11–W16/W2/W5 | `browser.preview` del HTML estático rev3 | **APROBADA** — aprobación visual rev3 del 2026-10-28; incluye ficha móvil en tarjetas, estados, W15b, D1/D2/D3 |
| Aprobación visual rev3 | Mensaje explícito del usuario, 2026-10-28 | **PASS** — «Apruebo la revisión visual rev3 de W2/W5 y W11–W16 de SPEC22, incluidos los estados y bloqueos D1/D2/D3.» No autoriza DEV22, esquema, commits, push, PR ni merge |
| Capturas de revisión rev3 | Playwright 1.64.1, Chromium 1248, 1440/390, base histórica `064df64` | **GENERADAS Y EMPAQUETADAS** — 20 capturas (sección y estados/bloqueos) + 2 de página completa; `overflow-report.json` con 20/20 `horizontalOverflow=false`; ZIP versionado `specs/22-ventas-posicion-broker-captures/rev3/spec22-wireframes-rev3-review.zip` (SHA-256 `50153491…b3cd1f`) |
| Revisión independiente focalizada rev3 | Revisor en contexto separado, solo lectura | **PASS final** — 3 hallazgos (regresión de wrapping en W11, paridad W11/W12, acción del error) corregidos; ZIP regenerado con el HTML/capturas actuales |

No se declara PASS sin comando, entorno, candidato y evidencia. No hay pruebas funcionales,
CI remoto ni verificación de implementación en esta ronda.

## Dependencias, riesgos y bloqueos

- **Aprobación SPEC19 rev10:** resuelta el 2026-10-27 e integrada en `main` `156a50d` (registro
  original `3c271d3`, posterior a `27c8d07`); C16/C17 congelados y `schemaVersion = 18`. No se
  modifica SPEC19 ni se reabre la aprobación.
- **E4.1 integrada:** `156a50d` en `main`, v18, con QA PASS y CI Linux verde. Los AC de esquema,
  backup, motor único y guard de Saldo de E4.2 siguen UNRUN por ausencia de implementación E4.2,
  no por la dependencia.
- **D7 / SPEC19:** E4.1 rev10 no define un guard de cantidad vendida porque Ventas queda fuera de
  su alcance. D7 exige una enmienda mínima y explícita de SPEC19: rechazar con 422
  `INSUFFICIENT_UNITS` toda rectificación o anulación de Compra que deje la cantidad vigente por
  debajo de la vendida, sin escritura y con fecha/cantidad del mínimo. La enmienda requiere
  aprobación separada y no se aplica en esta ronda.
- **Versión de esquema:** E4.2 no reserva ninguna; la ampliación de `clase` a `Venta` se resolverá
  en DEV conforme al gate de esquema vigente (v18). Si se elige una migración, deberá preservar
  filas, auditoría, identidad y datos ajenos.
- **Decisiones financieras:** D1/D2/D7 están confirmadas A; las alternativas B quedan
  descartadas. Cualquier cambio posterior exige nueva decisión y revisión de specification,
  códigos, AC y testplan.
- **Revisión Comida:** la fuente de la tercera fecha pertenece a E3.4; E3.5 consume la
  agregación por ciclo. E4.2 consume su contrato y no reimplementa su motor. La prueba de tres
  fuentes no acredita integración de E3.4/E3.5.
- **Sin bloqueo de acceso:** no hay conflicto de ownership detectado en `specs/22-*`; no se ha
  contactado ni reanudado otra sesión.

## Próxima acción segura

1. Publicar la rama documental con la specification y el testplan aprobados; su merge requiere
   aprobación expresa del head vigente.
2. Preparar la enmienda mínima de SPEC19 para D7 como propuesta separada; no modificar SPEC19 en
   esta ronda.
3. No iniciar DEV22 ni reservar versión sin autorización de desarrollo separada.
