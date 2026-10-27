# 19 — E4.1 Instrumentos y Compras de inversión: Progress

Status: **APPROVED rev7** — specification y wireframes aprobados el 2026-10-26 sobre el commit
`47f469a902330ac199c910225563f909bd5116eb`; testplan aprobado con ella.
**APPROVED rev8** — ajuste técnico a la versión 16 aprobado por el usuario el 2026-10-26 sobre
`f439010d527ba65953a1ccc0aa47cbeb51cfce31`; se mantienen las decisiones funcionales de rev7.
**PROPOSED rev9 — pending Codex review; NOT approved** — alinea 13/14→16 con `main` v15
(`24b48c5`) y las tablas vacías de Compartidos; no cambia decisiones funcionales.
**STOP 2026-10-27:** `main` avanzó a `2487656` (16, DEV16 Revisión bancaria de Comida); la 16
está ocupada; rev10 se renumera finalmente a **18** por la colisión con D5. DEV autorizado y ejecutado; **PR, merge y
despliegue no autorizados**.
**DEV19 IMPLEMENTADO 2026-10-27** — reconciliación de `origin/main` `9977210` y adaptación a
`schemaVersion = 18`: admisión C16/C17, cadena 16→17→18 y backup/restore 13..18. Candidato
verificado `b0969c8`; CI Linux `40576582999` SUCCESS; QA independiente PASS (48 PASS / 6
PARCIAL / 0 FAIL). PR #95 en draft; sin merge ni despliegue.

## DEV19 — implementación de la versión 18 (2026-10-27)

Autorización: el usuario autorizó DEV19 el 2026-10-27 con las condiciones de gate, reconciliación
manual, implementación v18, pruebas/QA/CI y no alteración de C16/C17.

- **Gate pre-DEV:** `origin/main` `9977210` (esquema 17), 18 libre en refs/worktrees, C16/C17
  intactos (`f9a30cdc…`), sin conflictos de ownership.
- **Reconciliación:** merge `8e9ce67` de `origin/main` en la rama; 18 conflictos resueltos
  manualmente preservando D5 (`movimiento_compartido`, CHECK de Transferencia), E3.4 Revisión
  de Comida, Compartidos v15 y Vehículos. Add/add de `database-v15` resuelto a favor del builder
  genuino de main.
- **Implementación:** `schemaVersion = 18`; listas `[1..17, version]`; `admitted` 16/17 y
  umbral >18; cadena `revisionComida(16) → compartidoAportacion(17) → investment(18)` en base
  existente y nueva; guarda de `investmentSchema` sobre 17; backup/restore 1..18 con etiquetas
  `e3.4-v16`/`e3.2-d5-v17`/`e4.1-v18` e intentos E4.1 desde 18.
- **Pruebas:** typecheck PASS; suite focal 58/58; nueva prueba versionada 17→18 con una fila
  D5 real (`E4.1-AC-33(f)`); matriz de restore 13..18. Suite API macOS: 244 PASS y 50 fallos de
  plataforma (`libc.so.6`, rutas), sin regresión frente al baseline (219/48). E2E macOS: 11
  PASS / 2 fallos de restauración por plataforma; CI Linux cubre esos caminos.
- **CI Linux x86_64:** run `40576582999` SUCCESS sobre `b0969c8` (293 PASS / 1 FAIL corregido
  después en `b0969c8`).
- **QA independiente:** PASS técnico, 48 AC PASS, 6 PARCIAL (AC-03/24/27/30/33/34), 0 FAIL, 0
  UNRUN bloqueante; validó además 17→18 con preservación de 145 objetos C17 y 0 pérdidas.
- **Pendiente:** PR #95 sigue en draft; merge y despliegue requieren autorización separada.
  AC-33 conserva residuales de cobertura (variantes v16/v17 incompletas y tablas heredadas
  vacías) declarados en el testplan.

Specification: [19-instrumentos-compras-inversion-specification.md](19-instrumentos-compras-inversion-specification.md)
Brainstorming: [19-instrumentos-compras-inversion-brainstorming.md](19-instrumentos-compras-inversion-brainstorming.md)
Test plan: [19-instrumentos-compras-inversion-testplan.md](19-instrumentos-compras-inversion-testplan.md)

## Aprobación registrada — 2026-10-26

- Objeto: **SPEC19 de E4.1 rev7**, incluidos wireframes W1–W10 y testplan.
- Commit aprobado: `47f469a902330ac199c910225563f909bd5116eb`.
- Mensaje real del usuario: «Apruebo la SPEC19 de E4.1 rev7, incluidos wireframes y testplan,
  correspondiente al commit 47f469a902330ac199c910225563f909bd5116eb.»
- Alcance de la aprobación: contrato de diseño documental. **No autoriza DEV, merge ni
  despliegue.** La implementación requiere una autorización separada posterior al gate de
  destino y a la congelación de manifiestos v14.
- Este checkpoint posterior solo registra la aprobación y el estado; no cambia el contenido
  funcional aprobado sobre `47f469a`.

## Ajuste técnico rev8 — versión 16 (2026-10-26)

- Autorización del usuario: ajuste documental de E4.1 a la siguiente versión libre,
  provisionalmente **16**, respetando la reserva 15 de Compartidos.
- `origin/main` = `f5bf032` (esquema 14); el ref local `main` puede estar retrasado, por lo que el gate usa `origin/main`; `codex/dev14-base-b` = `e4ff2df` (esquema 15, Compartidos
  v15 + Vehículos; `ad2edfe` era el commit congelado y el esquema no cambió). También declaran v15 `codex/dev16-revision-comida` y su remoto; solo el
  contrato `C15-COMPARTIDOS-AD2EDFE` está verificado por E4.1, cualquier otro v15 se rechaza.
  La 16 está libre en la revisión. No se contactó ni modificó la sesión de Compartidos.
- Contrato real v15 congelado: `C15-COMPARTIDOS-AD2EDFE` (`ad2edfe`, 122 objetos),
  SHA-256 `d1a5b5479cc78c5aaa42d07a3c47ed443b475e3b4cfcac81372d99c50d34fff5`.
  Fixture v15 con filas sintéticas de Compartidos y Vehículos:
  `6c0b9bb51054d74d34cf67494cee8b6b9745b8a3ce4a4acce75fa95b5b2ea226`.
- Rutas documentadas: 13→16, 14→16 y 15→16; 15→16 preserva todas las tablas y filas de
  Compartidos v15, Vehículos, Referencias, contadores y auditorías, sin reejecutar 14→15 ni
  reseedear.
- Compuertas: `schemaVersion = 16`, admisión `1..16`, `[1..15, version]`, `backup.ts 1..16`,
  etiqueta `e4.1-v16`; restore verifica manifiestos v14/v15. Sin implementación de E4.1.
- Gate pre-DEV: **PASS para 16 a 2026-10-26, condicional**; debe repetirse sobre refs
  locales/remotos antes de DEV.
- Gate repetido tras la aprobación (2026-10-26): `origin/main` `f5bf032` = 14;
  `codex/dev14-base-b` `e4ff2df` = 15 con el mismo manifiesto C15 (HEAD previo `935dee9`); `codex/dev16-revision-comida`
  y su remoto = 15; ningún ref declara 16. Resultado: **PASS para 16**.
- Estado: **rev8 aprobada** por el usuario el 2026-10-26 sobre `f439010`. No autoriza DEV,
  merge ni despliegue.

## Aprobación rev8 — 2026-10-26

- Objeto: **SPEC19 rev8 y su testplan**, commit `f439010d527ba65953a1ccc0aa47cbeb51cfce31`.
- Mensaje real: «Apruebo el ajuste técnico de SPEC19 rev8 y su testplan correspondiente al
  commit f439010d527ba65953a1ccc0aa47cbeb51cfce31. Se mantienen las decisiones funcionales
  aprobadas de rev7.»
- No autoriza DEV, merge ni despliegue.

## Checkpoint documental — 2026-10-26

- Checkout: `/private/var/folders/45/l03g6c0x15748l6t9c0f7zm80000gp/T/opencode/pilot-e41`.
- Rama: `codex/pilot-full-e41-instrumentos-compras-inversion`; base `e408b1da5ae9f45c9bfd139d11f362216b5bce26`.
- Alcance: solo documentación y ejemplos ficticios. Sin código, SQL ejecutable, migraciones,
  pruebas funcionales, datos reales, PR, merge ni despliegue.
- Cierre aplicado: coordinación de esquema con Compartidos/PR75 y Vehículos sin tocar sus
  sesiones; semántica unívoca de errores (suficiencia recalculada 422 `INSUFFICIENT_CASH`;
  revisión obsoleta 409 `REVISION_CONFLICT`; huella de Movimiento 409 `IMPACT_CHANGED`; guard
  de Saldo 409 `HISTORY_LOCKED`); residual R4-1 de AC-41 resuelto con precondición ordenada
  sobre `S003`.
- Contrato v14/v15 (rev8): no se acepta una base por su número. Se conserva
  `C14-COMPARTIDOS-FCE1107` como evidencia histórica, pero **no** como origen de upgrade; solo
  `C14-VEHICULOS-C69E343` y `C15-COMPARTIDOS-AD2EDFE` son orígenes admitidos, con manifiesto
  canónico y SHA-256. Una variante desconocida, incompleta o un v14 de Compartidos se rechaza
  antes de `BEGIN IMMEDIATE`/`journal_mode`/DDL/backup. E4.1 usa la 16; la 15 queda para
  Compartidos.
- Verificación canónica: `python3 scripts/verify baseline` con Python 3.12.14 → **PASS**,
  incluida la comprobación de espacio en blanco del commit.
- Revisión independiente real: **PASS** tras corregir restore/intentos, rutas
  `metrics.liquidez`, alcance de `IMPACT_CHANGED`, precondición AC-41, contrato v14,
  serialización del manifiesto y residuales editoriales; sin hallazgos bloqueantes. La
  revisión no escribió archivos ni contactó otras sesiones.
- Sesiones del cierre: coordinador `ses_e86859b93ffdjZlpllG1FflZol`; revisor independiente
  `ses_e86523c99ffeNgigtCay1EMUq1`.

## Gate pre-DEV — dictamen (2026-10-26)

- La rama se actualizó con `origin/main` mediante el merge `dd7c457` («merge: sync E4.1
  documentary branch with main schema 14»), preservando los commits documentales. La base de
  trabajo ya es el esquema 14 de `main`.
- `origin/main` es `f5bf0325e52cdd4c875aacb32f086dd67a08befa` («feat(vehiculos): ficha e
  ITV...», PR81), `schemaVersion = 14`.
- Manifiestos congelados en `apps/api/src/schema-contracts.json`:
  - `C14-COMPARTIDOS-FCE1107` (`fce1107`, 114 objetos) →
    `df6ad4b2e069392a3aa3e1dd616f15afdd5a78738a64ae0199a57dd67b607c8d`
  - `C14-VEHICULOS-C69E343` (`c69e343`, 111 objetos) →
    `f262020fd1658cf0e7c873c32a0322479dbe91f67d3027e178f89b072a86c857`
- El fixture de `main` 14 produce exactamente el mismo manifiesto y SHA-256 que
  `C14-VEHICULOS-C69E343`; el v14 de `main` **coincide** con el contrato admitido.
- **La 15 no está libre.** `refs/heads/codex/dev14-base-b` está en `ad2edfe` y declara
  `schemaVersion = 15`; sus worktrees `dev14-baseb` y `dev14-qa` siguen activos. El ref remoto
  `origin/codex/dev14-base-b` aún está en `fce1107` (14), pero la reserva local 15 existe y no
  se puede ignorar.
- Fixtures SQLite aislados generados fuera del repo: Compartidos
  `e6a490ae25a9c0c3c9d87ce8a599de55a2bb462961a63b03fd05dcb9ec496d96`; Vehículos/main
  `34cadc7ef7f98a0db0153e180b4449a78337a7a43121d0c538fccd4c847de383`. No se publican.
- **Resultado inicial:** **STOP — versión destino no disponible (2026-10-26).** El contrato v14
  y los manifiestos son correctos, pero la 15 está ocupada por `codex/dev14-base-b`.
- **Resolución:** el usuario autorizó el ajuste técnico a la 16. Se añadió el contrato real
  `C15-COMPARTIDOS-AD2EDFE` y las rutas 13/14/15→16; el gate para 16 queda **PASS condicional**
  a 2026-10-26. La 15 no se toca.
- Revisor independiente del PRE-DEV-SCHEMA: `ses_e8626d90bffeSZElYYcR4XhU2n`; detectó la
  colisión de la 15 antes de aceptar el gate.

## Incidencia del piloto — cambio de sesión

- La sesión anterior del piloto quedó bloqueada por un error del proveedor y **no** se ha
  contactado, reanudado ni modificado.
- El trabajo se recuperó desde este checkout y los tres documentos; no se repitió el
  brainstorming ni se reabrieron Q1–Q10, H1–H3 o N1–N12.
- No hubo cambios en el harness, Skills, hooks, scripts, workflows, permisos ni visibilidad.
- Impacto: continuidad documental sin pérdida; el cierre pendiente se completó en una sesión
  nueva y queda registrado aquí para el handoff.

## HANDOFF — 2026-10-26 — STOP REQUESTED — NO AUTO-RESUME

- **Feature / scope:** PILOT-DS-FULL-EPIC-01 · E4.1, fase documental PRE-DEV-SCHEMA y ajuste
  técnico SPEC19 rev8 a esquema 16. **DEV no autorizado.**
- **Repositorio / rama / worktree / HEAD:** `/private/var/folders/45/l03g6c0x15748l6t9c0f7zm80000gp/T/opencode/pilot-e41`;
  rama `codex/pilot-full-e41-instrumentos-compras-inversion`; HEAD
  `31421d9e25008a38e5ba470ffb0bdf9fa732bf25`. Árbol limpio. Sin push, PR, merge ni despliegue;
  portabilidad remota no verificada.
- **Workers:** no existe tooling de workers controlados en esta sesión; los subagentes de
  revisión finalizaron. `ps` no muestra procesos de pilot, tests, dev server ni Playwright.
  Las sesiones/worktrees de Compartidos (`dev14-baseb`, `dev14-qa`) y Vehículos/`dev16` no son
  controlados por esta sesión y no se tocaron.
- **Completado:** SPEC19 rev8 y testplan aprobados sobre `f439010`; manifiestos C14/C15
  congelados y auto-verificados; fixtures aislados y generador reproducible; rutas 13/14/15→16;
  gate de destino repetido sin refs en 16; documentación de aprobación y checkpoint.
- **Pendiente:** autorización explícita de DEV; repetir el gate inmediatamente antes de
  implementar. Sin implementación E4.1.
- **Checks:** `python3 scripts/verify baseline` → **PASS** sobre HEAD `31421d9`; revisión
  independiente final **PASS** sobre `f439010`; suites de aplicación y migraciones E4.1
  **UNRUN**.
- **Gate de destino (última comprobación):** `origin/main` = `f5bf032` (14);
  `codex/dev14-base-b` = `e4ff2df` (15, mismo manifiesto C15); `codex/dev16-revision-comida` =
  `4382f6c` (15); ningún ref local/remoto declara 16. PASS para 16, condicional a repetir el
  gate antes de DEV.
- **Aprobaciones:** SPEC19 rev7 y rev8 aprobadas por el usuario; DEV, merge y despliegue **no**
  autorizados.
- **Siguiente acción segura:** nueva sesión debe inspeccionar este handoff, verificar HEAD,
  aprobaciones y gate, y esperar autorización explícita de DEV. No reanudar por inferencia.
- **Checkpoint:** este archivo; no hay cambios sin commitear.

## DEV autorizado y gate de versión repetido — 2026-10-26

- **Autorización humana:** el usuario autorizó DEV de E4.1 conforme a SPEC19 rev8, aprobada
  sobre `f439010d527ba65953a1ccc0aa47cbeb51cfce31`, conservando las decisiones funcionales de
  rev7. Merge y despliegue siguen **no** autorizados.
- **Gate repetido inmediatamente antes de DEV (PASS para 16):** `git fetch origin` ejecutado;
  `origin/main` = `f5bf032` (14) y su manifiesto generado es
  `f262020fd1658cf0e7c873c32a0322479dbe91f67d3027e178f89b072a86c857` (111 objetos), idéntico
  a `C14-VEHICULOS-C69E343`. `codex/dev14-base-b` y su remoto = `930d221` (15) con manifiesto
  `d1a5b5479cc78c5aaa42d07a3c47ed443b475e3b4cfcac81372d99c50d34fff5` (122 objetos), idéntico
  a `C15-COMPARTIDOS-AD2EDFE`. `codex/dev16-revision-comida` y su remoto = `4382f6c` (15) con
  un manifiesto v15 distinto (124 objetos, `5baad4a8…1287fe`), que E4.1 **no** reconoce como
  origen; no ocupa la 16. Ningún ref local/remoto declara `schemaVersion = 16`; la 16 sigue
  libre. La 15 de Compartidos no se toca.
- **Manifiestos congelados:** `apps/api/src/schema-contracts.json` se auto-verifica con sus tres
  SHA-256 declarados (C14 histórico, C14 Vehículos y C15 Compartidos).
- **Baseline:** `~/.local/python/3.12/bin/python3.12 scripts/verify baseline` → **PASS** sobre
  HEAD documental `dc250ad`, incluida la comprobación de espacio en blanco.
- **Checkout de DEV:** `/private/var/folders/45/l03g6c0x15748l6t9c0f7zm80000gp/T/opencode/pilot-e41`,
  rama `codex/pilot-full-e41-instrumentos-compras-inversion`, HEAD `dc250ad`, árbol limpio. Un
  único ejecutor de DEV; QA independiente posterior en checkout aislado.

## DEV y QA independiente — 2026-10-27

> Estado histórico del contrato 16; superado por DEV19 (v18, CI Linux verde).

- **Ejecutor DEV:** subagente real `ses_e85ef3979ffegZjzgMA7k0PzUT`, en el checkout del piloto.
  Primer candidato `47a5b56` (implementación completa: esquema 16, API, motor, integraciones,
  UI, tests y testplan).
- **QA independiente 1:** subagente `ses_e85c21434ffeNTjIjccJrpxTZ2`, checkout aislado
  `qa-e41` en `47a5b56`. Dictamen **CHANGES REQUIRED** con 8 hallazgos: UI ilegible/sin ficha
  móvil; dos tests que fallarían en Linux; idempotencia de Instrumento con ISIN; pérdida de
  precisión en `financeRevision` >2⁵³; cobertura AC insuficiente; orden de la compuerta de
  manifiesto; detalles de foco/estado/error en UI; inmutabilidad SQLite/paginación.
- **Correcciones DEV:** candidato `dba5825f237cee8216f2b7d60ef966d63c203e03`; corrige los ocho
  hallazgos y amplía `inversiones-ac.test.ts` e `inversiones-backup.test.ts`.
- **QA independiente 2:** checkout aislado `qa-e41-r2` en `dba5825`, mismo revisor.
  Dictamen **PASS para publicar la rama y abrir PR, no para merge**. Matriz final: **48 PASS,
  6 PARCIAL** (AC-03, AC-24, AC-27, AC-30, AC-33, AC-34), 0 FAIL funcional y 0 UNRUN
  bloqueante. Residuales de cobertura/foco documentados en el testplan.
- **Evidencia local (macOS):** focal
  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts apps/api/src/flujo-mensual.test.ts`
  → **34 pass / 0 fail / 442 aserciones**; typecheck **PASS**; build **PASS**; E2E Inversiones y
  flujo mensual **2 passed**; capturas 390/1440 inspeccionadas por QA. `bun test apps/api`
  nativo → 198 pass / 48 fail, todos por `libc.so.6`/`renameat2` de macOS; `scripts/verify
  --full` no puede completar API/E2E en macOS. En simulación Linux (copia temporal con
  `publishNewDirectory` compatible) backup/restore 13/14/15/16 y O4 **PASS**; quedan solo
  artefactos de plataforma. La evidencia Linux/CI real es obligatoria antes de merge.
- **Higiene:** sin datos reales, DB, claves, tokens, capturas versionadas ni cambios en
  harness/CI/permisos. Sin push, PR, merge ni despliegue en esta fase.
- **Workers:** ninguno activo tras el QA; solo el coordinador continúa.

## Publicación de rama y bloqueo de PR — 2026-10-27

> Estado histórico; la PR #95 existe y DEV19 tiene CI Linux verde.

- **Push:** rama `codex/pilot-full-e41-instrumentos-compras-inversion` publicada en `origin`
  (`git push -u`), HEAD `424c120`. El push remoto correcto fue confirmado por Git; árbol local
  limpio.
- **PR:** **NO creada.** El entorno no dispone de `gh` ni de credenciales/token de GitHub API
  (keychain y `git credential` sin datos; el remoto usa SSH y el push funciona). No se
  inventó ni extrajo ningún token. URL de comparación para autorización humana:
  `https://github.com/josemartin2000/myfinanzas-app/pull/new/codex/pilot-full-e41-instrumentos-compras-inversion`.
- **CI:** el workflow `Validate project` se dispara también en `push`, pero al ser el
  repositorio privado y no haber autenticación de API en esta sesión, **no se pudo consultar**
  el resultado de las ejecuciones. CI Linux sigue **UNRUN/UNKNOWN** y es requisito de merge.
- **Siguiente acción segura:** el usuario o una sesión con credenciales GitHub debe abrir la PR
  desde la URL anterior (o conceder `gh`/token) y verificar CI Linux; después, corregir si
  falla. **No merge ni despliegue** sin aprobación explícita del usuario y CI verde.

## Cambio de main, integración y STOP por discrepancia — 2026-10-27

- **Main avanzó durante la preparación de la PR:** `origin/main` pasó de `f5bf032` (14) a
  `24b48c5` (15, PR75 Compartidos Base B + harness v2.14). Manifiesto regenerado: 122 objetos,
  SHA-256 `d1a5b5479cc78c5aaa42d07a3c47ed443b475e3b4cfcac81372d99c50d34fff5`, idéntico a
  `C15-COMPARTIDOS-AD2EDFE`. La 16 sigue libre; gate para 16 **PASS** con el `main` actual.
- **Integración:** merge `--no-ff` de `24b48c5` en la rama E4.1 → candidato
  `51d7f5d678d358cfcd68a1bf01acc3849a8a4d5a` (padres `30ff49c` + `24b48c5`). Se preservaron
  Compartidos v15, Vehículos, harness v2.14 y los documentos SPEC19; sin reejecutar 14→15 en
  la ruta 15→16.
- **QA independiente final:** mismo revisor `ses_e85c21434ffeNTjIjccJrpxTZ2`, worktree
  `qa-e41-r3` en `51d7f5d`. **PASS para publicar la rama y abrir PR, no para merge**; 35
  pass / 457 aserciones focales, typecheck/build/E2E (Inversiones, flujo mensual y Compartidos)
  PASS, backup/restore y O4 PASS en simulación Linux. Detectó una **discrepancia documental
  MAYOR**: SPEC19 rev8 decía que 13→16 «no crea tablas de Compartidos», pero `main` v15 obliga
  a la progresión canónica 13→14→15→16. **STOP antes de PR/merge.**
- **Ajuste propuesto:** **SPEC19 rev9 y testplan rev9, pendientes de revisión/aprobación por
  Codex**. Justifican la progresión 13/14→15→16, las tablas de Compartidos vacías cuando el
  origen no las tenía, la preservación de filas/identidad y que los `DROP`/`ALTER` de la
  migración 14→15 son de `main`, no del DDL propio de E4.1. No se declaran aprobados.
- **Rama remota publicada:** `origin/codex/pilot-full-e41-instrumentos-compras-inversion` en
  `30ff49c` antes del merge; el candidato fusionado `51d7f5d` y el checkpoint rev9 se publican
  juntos al cierre, sin PR.
- **Subagentes reales:** DEV `ses_e85ef3979ffegZjzgMA7k0PzUT`; QA independiente
  `ses_e85c21434ffeNTjIjccJrpxTZ2`. Ninguno activo. No se contactó ni reanudó la sesión
  anterior.

## STOP final — la 16 ya está ocupada por main (2026-10-27)

- **Nuevo avance de `main`:** tras publicar rev9, `origin/main` pasó a
  `2487656` (PR82/DEV16, «Revisión bancaria de Comida») y declara `schemaVersion = 16`
  (`database-identity.ts`). La **16 ya no está libre**; el gate de destino falla para rev9.
- **Dictamen:** E4.1 no puede aprobarse ni publicarse como 16. Se requiere **rev10**, que tras
  detectar la colisión con D5 se renumera a **18**, con contrato de main v16, preservación de las
  tablas/datos de Revisión bancaria de Comida, rutas 13/14/15/16→18 (y 17→18 solo con C17) y
  repetición de gate, revisión independiente y QA. No implementado ni aprobado.
- **Estado remoto:** rama `codex/pilot-full-e41-instrumentos-compras-inversion` publicada en
  `ebcee48` (merge `51d7f5d` + docs rev9/STOP). **Sin PR**, sin merge y sin despliegue. El candidato
  `51d7f5d` sigue siendo válido como evidencia de DEV/QA para el contrato 16, pero **no es
  publicable** con el `main` actual.
- **Subagentes:** DEV `ses_e85ef3979ffegZjzgMA7k0PzUT`; QA `ses_e85c21434ffeNTjIjccJrpxTZ2`.
  Ninguno activo. No se contactó la sesión anterior.

## Rev10 documental — destino 18 (2026-10-27)

- **Alcance:** solo SPEC19 y testplan rev10 propuestos. **Sin implementación, sin integración
  de main 16 en la rama y sin adaptar código.** El candidato `51d7f5d` sigue siendo evidencia
  del contrato 16, no de rev10/18.
- **Contrato real de main v16:** `origin/main` `1d539a8` (docs; esquema 16 introducido en
  `2487656`, PR82/DEV16, fuente `26b6f0c`) declara `schemaVersion = 16`. Manifiesto regenerado
  en `main` y en `26b6f0c`: **135 objetos**, SHA-256
  `9d9b0783c519d32d667ae2a3911310b3667bfc4783089db4e6eea9171a9d2dc4`; propuesto como
  `C16-REVISION-COMIDA-26B6F0C`. Incluye `revision_comida`, `revision_comida_audit`,
  `revision_comida_attempts`, tres índices, siete triggers y el contador `revision_comida`;
  conserva Compartidos v15, Vehículos y el resto. La 16 queda ocupada.
- **Colisión con D5 y reserva de la 18:** el barrido de refs no encuentra 17, pero el worktree
  ajeno `dev14-d5` (rama `codex/dev14-d5-exterior`, HEAD `06f7389`) mantiene cambios **sin
  commitear** con `schemaVersion = 17`, `compartidoAportacionSchema` y etiqueta
  `e3.2-d5-v17`. No se toca ni se reanuda. La 17 **no se considera libre en la práctica**; la
  **18 está libre** en refs y worktrees. Rev10 renumera a 18 y exige que el gate incluya
  worktrees/estado sin commitear, no solo refs. Si D5 integra un C17 verificado, habrá que
  congelarlo y añadir 17→18 antes de adaptar E4.1; hasta entonces 17 no es origen admitido.
- **Rutas propuestas:** 13→14→15→16→18, 14→15→16→18, 15→16→18 y 16→18; 17→18 solo con C17
  verificado. Las tablas heredadas de Compartidos y Revisión de Comida se crean vacías si el
  origen no las tenía; no se importan datos ni se reseedea. La extensión propia 16→18 es
  aditiva y preserva datos, tablas, triggers, índices, contadores e identidad; las migraciones
  14→15 y 15→16 son de main y no se atribuyen a E4.1.
- **Backup/restore propuesto:** 1..18, etiqueta `e4.1-v18`, verificación de manifiestos
  v14/v15/v16 (y C17 si existe) antes de publicar, copias 13-17 verificadas conservan su
  esquema de origen, copia 18 recupera Instrumentos/Compras/auditorías y vacía sesiones,
  desafíos e intentos.
- **Gate pre-código:** repetir `git fetch`, el barrido de refs y de worktrees/estado sin
  commitear; STOP si `main` llega a 18, la 18 se ocupa, cambia un manifiesto, falta C16 o D5
  mantiene 17 sin C17. No se adapta código hasta aprobar rev10 y repetir el gate.
- **Revisión independiente real:** primera revisión `ses_e855c3b42ffeozuhc57VekMFwE` emitió
  CHANGES por la colisión D5; tras renumerar a 18 y corregir P2–P4, la re-revisión
  `ses_e83c20310ffenuRa2CztjhFqAn` emitió **PASS** sobre los cinco puntos y confirmó C16
  (135 objetos/`9d9b…2dc4`), 18 libre en refs/worktrees y D5 intacto. Rev10 queda lista para
  commit y revisión de Codex, **no aprobada ni publicable**.

## Autorización DEV original (texto reproducido)

> «Autorizo DEV de E4.1 conforme a SPEC19 rev8, aprobada sobre
> f439010d527ba65953a1ccc0aa47cbeb51cfce31, conservando las decisiones funcionales de rev7.»

Mensaje del usuario reproducido literalmente. Autoriza **rev8/contrato 16**, no rev10/18; su
acreditación formal en este checkpoint queda pendiente y no se usa para aprobar rev10.

## Ventana de espera aceptada — D5/17 (2026-10-27)

- **E4.1 queda congelado:** conserva su código/candidato `51d7f5d` (contrato 16) y la
  documentación rev10/18 publicada. **No se adapta código, no se integra main 16 y no se toca
  D5.**
- **Estado D5 observado:** worktree `dev14-d5` limpio, rama local
  `codex/dev14-d5-exterior` en `b0b69cf`, `schemaVersion = 17`; el ref no está publicado en
  `origin` y no está integrado en `main` (`1d539a8`, 16). La 17 está ocupada por D5, no cedida.
- **Condición de reanudación:** esperar la **integración verificada de D5 en main** y su
  **cesión explícita**. Después E4.1 reconciliará ese main, resolverá la aprobación de rev10,
  repetirá el gate (refs + worktrees/estado sin commitear) y solo entonces adaptará código a 18.
- **Límites de coordinación:** esta coordinación **no aprueba revisiones, merge ni despliegue**
  y **no concede ownership** sobre harness, workflows, CI ni configuración global. Cualquier
  aprobación o cesión debe constar explícitamente del owner correspondiente.
- **Sin PR, merge ni despliegue**; no se contacta ni reanuda la sesión de D5.

## HANDOFF histórico (congelación) → CODEX — 2026-10-27

> Superado por DEV19 (2026-10-27); se conserva como evidencia del cierre de congelación.

- **Estado:** DEV/QA del contrato 16 completados; **rev10/18 solo documental y pendiente de
  revisión/aprobación por Codex**. E4.1 espera la integración verificada de D5/17 y su cesión
  explícita. Sin implementación 18, sin integración de main 16, sin PR, merge ni despliegue.
- **Documento propuesto:** SPEC19 + testplan rev10 (destino 18, C16, rutas
  13/14/15/16→18 y 17→18 solo con C17, backup/restore 1..18 y preservación). La 18 está libre;
  la 17 está ocupada en la práctica por D5 sin commitear. El gate debe repetirse antes de
  adaptar código e incluir worktrees/estado sin commitear.
- **Candidato de código (histórico, contrato 16):**
  `51d7f5d678d358cfcd68a1bf01acc3849a8a4d5a`; no publicable como 18.
- **Rama remota:** `codex/pilot-full-e41-instrumentos-compras-inversion` en `f2bd68f`
  (rev10/18), confirmado por `git ls-remote`. Sin PR.
- **Evidencia gate 18:** `main` `1d539a8` = 16 con C16 (135 objetos,
  `9d9b0783c519d32d667ae2a3911310b3667bfc4783089db4e6eea9171a9d2dc4`); ningún ref en 18 y 18
  libre en worktrees; D5 mantiene 17 sin commitear.
- **Revisión independiente:** `ses_e855c3b42ffeozuhc57VekMFwE` (CHANGES por D5) y
  `ses_e83c20310ffenuRa2CztjhFqAn` (**PASS** final de rev10/18).
- **Subagentes:** DEV `ses_e85ef3979ffegZjzgMA7k0PzUT`; QA `ses_e85c21434ffeNTjIjccJrpxTZ2`;
  revisión rev10 `ses_e855c3b42ffeozuhc57VekMFwE`. Ninguno activo. No se contactó la sesión
  anterior.
- **Siguiente acción segura:** Codex revisa rev10 y su testplan. E4.1 **espera** la integración
  verificada de D5/17 y su cesión explícita; después reconcilia main, resuelve rev10, repite el
  gate y adapta código a 18. Después QA, CI Linux y PR. La coordinación no aprueba revisiones,
  merge ni despliegue. Sin merge ni despliegue por inferencia.
