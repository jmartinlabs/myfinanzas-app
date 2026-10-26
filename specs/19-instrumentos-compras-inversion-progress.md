# 19 — E4.1 Instrumentos y Compras de inversión: Progress

Status: **APPROVED rev7** — specification y wireframes aprobados el 2026-10-26 sobre el commit
`47f469a902330ac199c910225563f909bd5116eb`; testplan aprobado con ella.
**APPROVED rev8** — ajuste técnico a la versión 16 aprobado por el usuario el 2026-10-26 sobre
`f439010d527ba65953a1ccc0aa47cbeb51cfce31`; se mantienen las decisiones funcionales de rev7.
DEV, merge y despliegue **no** autorizados.
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

## Siguiente acción

DEV de E4.1 autorizado y en curso sobre la rama del piloto. Al cerrar el candidato: commit,
QA independiente en checkout aislado, `python3.12 scripts/verify --full`, actualización de la
matriz del testplan, push de la rama y PR hacia `main` sin merge ni despliegue.
