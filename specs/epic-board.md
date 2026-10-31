## Pendientes consolidados post Comida/Partidas — 2026-10-31 (vigente)

Entrada vigente de seguimiento. **No reabre** PR #136/#137 ni sus QA: ambas
entregas están integradas y se conservan como historia. Esta sección sustituye
las afirmaciones de «sin merge» y los límites sueltos de las dos entradas
siguientes, sin duplicar sus tareas.

Base contrastada: `main`/`origin/main` **`2e710c0`** (PR #146). Integradas:
#136 `7f3a66c` (Comida, v19), #137 `e0249c5` (D′, v20), #145 `936b600` (E2E) y
#146 `2e710c0` (tablas 390). CI postmerge `Validate project` **PASS**:
run `41235452202`.

Clasificación: **pendiente técnico** (trabajo acotado), **dependencia** (otro
frente debe entregar primero), **bloqueo** (impide avanzar), **mejora opcional**
(no bloquea) y **requiere autorización** (sin permiso específico no se ejecuta).
Los nombres de frente son de seguimiento del tablero; no crean AC ni
identificadores de spec.

### 1. RESTORE-19/20 — evidencia Linux integrada

**Tipo:** pendiente técnico · **requiere autorización** para DEV/ejecución Linux.
Alcance preparado en el [expediente](investigations/restore-v19-v20-linux-2026-10-31.md).

- Validar en **Linux** el restore de copias de aplicación **v19 y v20** con
  fixtures ficticias. v20 tiene cobertura en las matrices actuales; **v19 no
  tiene prueba dedicada**.
- El fallo de macOS por `libc.so.6` **no constituye validación**. El gate rootless
  **no sustituye** esta prueba.
- No existía expediente previo dedicado. Reutilizables: `restore-server.ts`,
  `materializeContract()` con `C19-COMIDA-UNICO-01`/`C20-DPRIMA-SIMPLIFICADA`,
  `inversiones-backup.test.ts`, `referencias.test.ts`, `d5-backup.test.ts` y
  `app.test.ts`; límites y huecos en el expediente.
- **Evidencia 2026-10-31:** PR #148 (test-only) con CI Linux `required` **PASS**
  (run `41241521688`; 377 PASS / 0 FAIL). Casos v19, v20 y negativos PASS.
  Integrada en `main` `2019fea`; CI postmerge `41243496311` **PASS**.
- No cierra AC ni DT6; el restore técnico queda acreditado, pero no la custodia
  externa, el gate rootless ni la restauración productiva con claves reales.
- Criterio de salida: v19 y v20 restauran con manifiesto/esquema correctos;
  v19 abierta migra a v20 conservando hechos, vínculos, auditoría e identidad;
  negativos fallan cerrado sin destino parcial. Sin datos reales.

**Siguiente paso:** ninguno sobre #148; queda integrada. DT6/T-BKP, rootless y
datos reales mantienen sus propios gates.

### 2. Comida — P3 y AC-25

**Tipo:** pendiente técnico + dependencia de datos/evidencia · **requiere
autorización** para datos reales. Checklist en la
[preparación read-only](investigations/pendientes-readonly-2026-10-31.md).

- **P3:** determinar fecha de corte **C** y saldo bancario **B** con evidencia;
  verificar cobertura íntegra posterior a C, inventario de transferencias y
  conciliación de consumidores. Sin cobertura se informa parcial/no disponible,
  nunca conciliado; sin prorrateo ni inferencia.
- **AC-25:** contrastar físicamente con `MyFinanzas2026_v5.11(7).xlsx`; no
  declarar equivalencia ni cerrar AC-25 sin contraste acreditado. v5.10 es
  histórica, no fuente equivalente.
- **Estado 2026-10-31:** el acceso a la fuente real no está disponible. P3 y
  AC-25 siguen pendientes; no se sustituye v5.11(7) ni se infieren datos. No
  bloquea RESTORE-19/20, que usa fixtures sintéticos.
- **CU parciales identificados:** 01, 03, 04, 05, 08, 10, 11, 15, 16, 20, 21 y
  23. CU-11 conserva evidencia Linux de restore en PR #148; el CU sigue PARCIAL
  por sus otros extremos.
- No activar el régimen ni migrar datos reales. DEV18 sigue STOP.

### 3. D′ — operativa real

**Tipo:** pendiente técnico + dependencia de SPEC27 · **requiere autorización**.
Inventario y mapping read-only en la
[preparación read-only](investigations/pendientes-readonly-2026-10-31.md).

- Preparar inventario y mapping físico de **Presupuestos** y **Plan Anual**,
  inicialmente en modo lectura. Preservar su funcionamiento; sin conversión,
  migración ni activación real.
- **Estado 2026-10-31:** el acceso a la base/Excel real no está disponible.
  Inventario y mapping quedan pendientes; no se infiere ni se migra. No bloquea
  RESTORE-19/20, que usa fixtures sintéticos.
- **Pendientes de operativa real:** AC-02, 07, 08, 09, 15, 16, 22, 24 y 26.
  Estado del testplan, que no se reclasifica aquí: 02/08/09/15/22/24/26 PARCIAL;
  07 UNRUN; 16 PASS (E1/S) con cobertura real pendiente.
- **UNRUN:** AC-12, 13, 18 y 19. AC-12/13 dependen de SPEC27; AC-18 es UI/E2E;
  AC-19 tiene evidencia de restore v20 en PR #148, pero sigue UNRUN como AC.
- Sin migración ni activación real.

### 4. E3.5 / FIN_NETA

**Tipo:** dependencia + pendiente técnico · **requiere autorización**.

- Mantener **DEV18 antiguo detenido**; no reanudarlo.
- Preparar posteriormente su adaptación al modelo integrado de **registro único
  de Comida en Movimientos**.
- Revisar fuentes y fórmulas de **Recursos** y cierre analítico; **no
  reconstruir FIN_NETA por inferencia**.
- Evitar duplicar gastos, devoluciones, financiación o reposiciones. E4.9 sigue
  bloqueado mientras E3.5 no sea verificable.

### 5. Dependencias de cierre y release

**Tipo:** dependencias/bloqueos · **requiere autorización**; nada ejecutable ahora.
Matriz en la [preparación read-only](investigations/pendientes-readonly-2026-10-31.md).

- **SPEC27:** fotografías de cierre, hechos tardíos y dependencias operativas.
  Diseño aprobado, AC UNRUN, sin DEV.
- **DT6/T-BKP:** evidencia de backup/restauración y recuperación externa. Sigue
  abierto y bloquea el cierre real; no se cierra por esta entrada. RESTORE-19/20
  acredita el restore técnico, no la custodia externa ni el gate DT6. Procedimiento
  propuesto en [DT6/T-BKP](investigations/dt6-t-bkp-procedure-2026-10-31.md),
  alineado con los criterios 0046; destino, custodia, modo, poda y ensayo real
  siguen pendientes de confirmación y no se ejecutan backups.
- **Gate rootless:** validar sobre una release real autorizada. No sustituye
  RESTORE-19/20. Sin despliegue ni activación.

#### E4.9 — gates separados

E4.9 **no se desbloquea solo con DT6**. Los gates son independientes:

| Gate | Estado | Efecto |
| --- | --- | --- |
| E3.5 / FIN_NETA | No integrado; DEV18 STOP | Bloquea **AC-08**; adaptación pendiente al gasto único de Comida en Movimientos |
| DT6 / T-BKP | Abierto y aparcado; sin datos físicos | Bloquea **AC-09**; los fixtures v19/v20 no acreditan custodia externa ni simulacro |
| E4.8 precierre | [PR #139](https://github.com/jmartinlabs/myfinanzas-app/pull/139) OPEN; sin merge ni DEV | Puerta del flujo E4.9; falta implementación o integración efectiva |
| DEV E4.9 / SPEC27 | No autorizado; AC **UNRUN** | Faltan cierre, foto, impactos, idempotencia, concurrencia, seguridad y pruebas |
| Entorno real | Gates separados | Datos, release/rootless y ejecución productiva no autorizados |

No bloqueantes por sí solos: E4.1 posiciones a Fin está integrada; E4.3, E4.2 y
E4.4 pueden figurar `Parcial`/`No disponible`; E4.10 y E4.11 están fuera de
alcance; DT3/DT4 están resueltas y no se reabren.

Orden recomendado, sin iniciar trabajo automáticamente: analizar la adaptación de
E3.5/FIN_NETA; revisar #139 para una eventual decisión documental; mantener DT6
aparcado; abordar DEV E4.9 solo tras aprobar alcance y dependencias.

### 6. Mejoras opcionales

**Tipo:** mejora opcional; sin AC ni prioridad de release.

- Evitar regiones de tabla focusables cuando no hay scroll necesario a 1440
  (`TableScroll`, `apps/web/src/ui.tsx`).
- Evaluar primera columna sticky a 390.

No bloquean release ni justifican DEV por sí solas.

## COMIDA-UNICO-01 — candidato de implementación 2026-10-31

> **Nota de vigencia 2026-10-31:** entrada histórica pre-merge. PR #136 está
> integrada en `7f3a66c`; el seguimiento vigente y los pendientes están en
> «Pendientes consolidados post Comida/Partidas».

Responsable de esta entrega: OpenCode, orquestador por encargo directo del usuario.
Especificación revisión 3 y wireframes aprobados (D1–D5, P1/P2/P4–P7/P7a) en
[SPEC16](16-revision-comida-specification.md#registro-de-aprobación-integral-y-coordinación--2026-10-31).
Base `main` contrastada: `98b9792` (squash PR #133). Rama de código:
`codex/comida-unico-01`; PR #136, sin merge autorizado.
Estado: candidato técnico local con base común de Movimientos (Tipo
`Devolución de gasto`), metadatos, atribución íntegra, roles y métricas
P5/P6/P7/P7a; esquema v19 con contrato estricto y upgrade v18 verificado.
Checkpoint: [progress16](16-revision-comida-progress.md#comida-unico-01--candidato-de-implementación-2026-10-31).
Límites: P3 (fecha/saldo/cobertura reales), activación, migración real, AC-25,
CI `required` PASS en `b51764d`; runs posteriores bloqueados por límite de pago
de Actions (anotación del check-run, reproducible en `main`). E2E local: 11 PASS
y 2 fallos de plataforma (`libc.so.6`/restore), sin acreditar E2E de la pantalla
nueva. Rootless bloquea por cambio de contrato de esquema sin autorización de
rollback: [informe](investigations/rootless-schema-upgrade-2026-10-31.md).
QA final **PASS** en `c96cb79` (H10/H11/OBS2). E2E 1440/390 PASS; tabla responsive en región accesible. DEV18 sigue STOP.
PR133 (documental) sigue sin merge autorizado; esta rama no la modifica.

## SPEC33 D′ — candidato de implementación 2026-10-31

> **Nota de vigencia 2026-10-31:** entrada histórica pre-merge. PR #137 está
> integrada en `e0249c5`; el seguimiento vigente y los pendientes están en
> «Pendientes consolidados post Comida/Partidas».

Responsable: OpenCode, orquestador por encargo del usuario. Especificación
revisión2 + E1/E2 aprobadas. Rama `codex/dprima-simplificada`, apilada sobre
`codex/comida-unico-01` (PR #136) por el proveedor central de devoluciones;
esquema v20. PR #137 (base `codex/comida-unico-01`, depende de PR #136, sin
merge autorizado). Implementado: maestro Partidas
raíz/hija con fuente, Gastos Previstos, Plan Mensual por raíz, apertura E1/E2,
G neto con devoluciones acreditadas, mapping diagnóstico explícito y UI básica.
Checkpoint: [progress33](33-dprima-simplificada-progress.md).
Límites: migración real, activación, cierre/fotos, mapping físico, restore v20,
E2E y CI Linux pendientes. QA final **PASS** en `89b8375`. E2E 1440/390 PASS; ficha responsive en región accesible. Presupuestos/Plan Anual permanecen
consultables sin conversión.

## Current checkpoint — Lote 1 documental y estado 2026-10-29

Sustituye como resumen vigente al checkpoint del 2026-10-28, que se conserva como
historia. Responsable único: coordinador (OpenCode). Esta entrada es documental: no
autoriza DEV, merge ni despliegue.

### Estado verificado

| Elemento | Estado |
| --- | --- |
| `main` / `origin/main` | `2c97a66` (squash PR #128) |
| Registro de auditoría | `audit/spec04-25` `147008f`; Lote 1 lo incorpora mediante la PR focal de esta entrega, pendiente de revisión/merge |
| SPEC01–03 | cerradas |
| SPEC04 | fixes #125 `e3ebd76` integrados; SPEC abierta; E2E/full UNRUN |
| SPEC07 | opción B #128 `2c97a66` integrada; AC28/E3.5/inversión/conciliación/cierre PENDING; E2E global UNRUN |
| Resto | 13 SPEC documental/aceptación; 6 DEV futuro/decisión; SPEC32 bloqueo de integración |
| PR abiertas | #51/#50 antiguas y sin autorización; #30 draft, esquema 16 frente a `main` v18 |
| Gates | SPEC16 AC25 físico; E3.5/FIN_NETA STOP; DT6/T-BKP; D7/SPEC19; posición a Fin SPEC26/27 |

### Lote 1 — alcance

- Solo documentación: notas de vigencia en SPEC04/05/06/08/09/10/13/14/15/16/19/20/21/31,
  tracker vigente y este checkpoint.
- Sin código, SQL, esquemas, contratos funcionales, DEV, merge ni despliegue.
- Verificación: perfil `docs` y CI de la PR; sin declarar PASS de aplicación.

### Próxima acción

Revisar y validar la PR documental; después decidir el Lote 2 (SPEC32/PR30) o el Lote 3
(E3.5) con autorizaciones separadas.

## Checkpoint 2026-10-28 — DT3/DT4 resueltas; DT6/T-BKP abierto (histórico)

Sustituye como resumen vigente al consolidado inferior, que se conserva como historia.
Responsable único del tablero: coordinador (OpenCode). El merge de esta entrada requiere
aprobación expresa del usuario. Esta entrada no autoriza DEV, no cierra DT6 y no habilita
el cierre E4.9.

### Decisiones del usuario (2026-10-28)

- **DT3 · último ciclo:** sin siguiente Inicio no hay cierre ni Fin manual; cuando exista
  un ciclo posterior, su Inicio acredita el Fin y el ciclo pasa a elegible.
- **DT3 · elegibilidad:** cerrable todo ciclo con ventana finita, S0 y núcleo consistente.
  Si hay cierres posteriores, se exige `CIERRE_FUERA_DE_ORDEN` con motivo y una
  comprobación de coherencia con sus fotos al mismo corte, incluidas las operaciones
  legítimas posteriores; solo una diferencia no explicable bloquea con
  `INCOHERENCIA_CON_CIERRE_POSTERIOR`. Un ciclo sin hechos solo se cierra si se acredita
  ausencia de operaciones imputables; el S0 (incluido 0) y las posiciones heredadas se
  capturan.
- **DT3 · plan siguiente:** sin precarga automática; E2.3 mantiene la copia explícita con
  revisión previa, ya vigente.
- **DT4 · foto:** contrato de SPEC27 aprobado. Trimestre/año usan la versión vigente al
  generar el agregado, registran la versión y la congelan; todas se conservan sin poda.
  Los metadatos inmutables incluyen versión de aplicación y de esquema.
- **DT6/T-BKP:** el usuario no dispone todavía de destino externo. Criterio fijado: copia
  externa cifrada + restauración aislada probada + ensayo mensual. El gate sigue abierto.

### Enmienda — revisión funcional de Álex (2026-10-28)

Precisiones compatibles, sin reabrir DT3/DT4:

- **AC-20:** comprobación de coherencia con las fotos de cierres posteriores; una
  contradicción financiera bloquea con `INCOHERENCIA_CON_CIERRE_POSTERIOR`; aviso y
  motivo no bastan. E4.10 no se desarrolla.
- **AC-21:** `Sin hechos` exige ausencia acreditada en todas las fuentes financieras
  aplicables según la tabla de fuentes y cobertura; ausencia de Movimientos ≠ ausencia de
  hechos; un cero informado es un hecho.
- **DT4:** metadatos inmutables con versión de aplicación y de esquema.

### Segunda revisión funcional de Álex (2026-10-28)

- **E4.10 · «último cierre»:** es el ciclo cerrado con el `Fin` cronológicamente más
  reciente y sin otro ciclo posterior cerrado; la fecha de registro es solo auditoría.
  Un cierre tardío de un ciclo anterior no habilita su reapertura ordinaria. E4.10 no se
  desarrolla.
- **AC-20:** comparación al mismo corte con las operaciones legítimas posteriores
  incluidas; solo una diferencia no explicable bloquea.
- **AC-21:** `Sin hechos` = ausencia de operaciones imputables al ciclo; el S0 (incluido
  0) y las posiciones heredadas se capturan; la ausencia de Compras nuevas no vacía la
  inversión ni la clasifica como `Sin hechos`.

### Estado verificado

| Elemento | Estado |
| --- | --- |
| `origin/main` / base | `a7808bd` (PR #110, aprobación confirmada por el usuario) |
| Rama | `codex/docs-dt3-dt4-resolution`, desde `a7808bd` |
| SPEC26/E4.8 | DT3/DT4 resueltas; DT6 abierto; AC-16 añadido; AC UNRUN |
| SPEC27/E4.9 | DT3/DT4 resueltas; DT6 abierto; AC-20/AC-21 añadidos; AC UNRUN |
| E4.8 DEV | no autorizado; desbloqueado por DT3/DT4, sujeto a autorización expresa |
| E4.9 DEV/cierre | bloqueado por DT6/T-BKP y E3.5/FIN_NETA; no autorizado |
| PR documental | [#111](https://github.com/jmartinlabs/myfinanzas-app/pull/111) con enmienda de revisión; merge pendiente de aprobación |
| CI `docs` | ver checks de PR #111; debe estar verde sobre el HEAD final antes del merge |
| Ejecutores | ninguno activo |

### Próxima acción segura

1. Verificar CI `docs` de la enmienda en la PR #111.
2. Obtener aprobación explícita del usuario antes del merge.
3. Tras el merge, decidir la autorización DEV de E4.8. E4.9 sigue bloqueado: no se
   reanuda ni se cierra por inferencia.

### Checkpoint

**Sin ejecutores activos; no hay reanudación automática.** Evidencia: `a7808bd`, rama
`codex/docs-dt3-dt4-resolution`, PR #111, SPEC26/SPEC27 y sus testplans. Bloqueos:
DT6/T-BKP (sin destino externo) y E3.5/FIN_NETA. No se ha ejecutado código ni pruebas.

# Coordinación global — consolidado 2026-10-28 (post PR #107)

Sustituye como resumen vigente a los apartados inferiores, que se conservan como historia.
Responsable único del tablero: coordinador global (OpenCode). Entrada en la rama
`codex/docs-board-20261028`; su merge requiere aprobación expresa del usuario. Esta entrada
no autoriza DEV, no autoriza el merge de otras PR y no autoriza despliegue.

## Hechos verificados (git + `gh`, 2026-10-28)

| Elemento | Estado verificado |
| --- | --- |
| `origin/main` | `a3956cf` — squash de PR #107; padre `2a50fbd` |
| PR #107 / SPEC26-27 | MERGED `a3956cf`; CI `40679692741` `docs` SUCCESS (1m33s); SPEC26/E4.8 y SPEC27/E4.9 APPROVED |
| PR #109 | MERGED `2a50fbd`; 86 referencias de GitHub canonicalizadas a `jmartinlabs` |
| PR #108 | MERGED `ac1773c`; perfil CI `docs` para Markdown documental; `required` intacto |
| Template #31 | MERGED `feadd6d`; default de Markdown documental con exclusiones protegidas |
| Cuenta GitHub | `jmartinlabs`; remotos de MyFinanzas y template actualizados |
| SPEC20 / E4.5 | APPROVED e integrada (`3d70fd6` / `f077b7e`); 59 AC documentales UNRUN |
| SPEC22 / E4.2 | APPROVED; DEV no iniciado; D7/SPEC19 pendiente |
| SPEC21 / E3.6 | documentación APPROVED; DEV no autorizado; E3.5/DEV18 STOP |
| E4.1 | integrada `156a50d`, v18; 6 AC PARCIAL (AC-03/24/27/30/33/34) |
| E4.8/E4.9 | specs y testplans aprobados; 33 AC UNRUN; DEV no autorizado |
| Gates abiertos | DT3 (ventana/corte), DT4 (foto), DT6/T-BKP (backup/restauración) |
| E4.3/E3.5 | no implementadas; valoración/Comida `No disponible` |
| E4.4 | SPEC17 en revisión, no aprobada; sin código |
| E4.5/E3.6 runtime | solo documentación; sin código; fuentes de lectura |
| Checkout principal | `codex/dev12-flujo-mensual` `e66bbd3` + `specs/session-handoff.md` sin seguimiento: preservados |

## Frentes y próxima decisión

- **E4.8/E4.9:** no iniciar DEV hasta cerrar DT3, DT4 y DT6/T-BKP; E4.9 además queda
  bloqueado hasta integrar E3.5/FIN_NETA. No se admite cierre parcial anticipado.
- **E3.6:** documentación aprobada; requiere decisión técnica de rutas y autorización DEV
  separada. E3.5 sigue STOP; agregados de Comida `No disponible`.
- **E4.2:** especificación aprobada; no iniciar DEV hasta resolver D7/SPEC19 y el gate de
  esquema.
- **E4.4:** SPEC17 en revisión; no se reabre por inferencia.
- **Detenidos:** DEV18/E3.5, DEV17/E4.4, B3/DEV32, PR50/PR51; sin cambios.
- **CI:** la PR #107 midió `docs` en 1m33s frente a 3m43s de referencia; PR #108 no cambió
  el workflow ni el check `required`.

## Próxima acción segura

1. Integrar este tablero mediante aprobación expresa.
2. Elegir el siguiente frente: cerrar DT3/DT4/DT6 para E4.8/E4.9, o autorizar DEV de E3.6/E4.2
   con sus gates separados.
3. Recomendado: handoff y nueva sesión tras integrar el tablero; este checkpoint no autoriza
   DEV ni reanudación automática.

## Contexto de reanudación

**STOP REQUESTED — NO AUTO-RESUME.** No hay ejecutores activos controlados por esta sesión.

- **Checkpoint:** este apartado; rama `codex/docs-board-20261028`; merge pendiente de aprobación.
- **Evidencia:** `a3956cf` (PR #107), `2a50fbd` (PR #109), `ac1773c` (PR #108),
  `3d70fd6`/`f077b7e` (E4.5), `156a50d` (E4.1), `feadd6d` (template #31).
- **Bloqueos:** DT3/DT4/DT6; E3.5/FIN_NETA; D7/SPEC19; SPEC17 E4.4 en revisión.
- **Próxima sesión:** verificar Git/PR, leer este tablero y elegir frente; no reanudar
  ejecutores ni fusionar PRs por inferencia.

---

# Coordinación global — consolidado 2026-10-27 (post PR #103)

Sustituye como resumen vigente a los apartados inferiores, que se conservan como historia.
Responsable único del tablero: coordinador global (OpenCode). Entrada en la rama
`codex/docs-board-consolidated-20261027`; su merge requiere aprobación expresa del usuario.
Esta entrada no autoriza DEV, no autoriza el merge de otras PR y no autoriza despliegue.

## Hechos verificados (git + `gh`, 2026-10-27)

| Elemento | Estado verificado |
| --- | --- |
| `origin/main` | `f11cfbe` — squash de PR #103; padre `aa6ba7d` (PR #102) |
| PR #95 / E4.1 | MERGED → `156a50d`; CI `40593315701` (required) y `40593353747` (full) SUCCESS sobre `60162e9` con 295 API / 0 FAIL / 13 E2E según evidencia de PR y QA |
| CI de `main` | `40594329598` (`156a50d`), `40594910289` (`aa6ba7d`) y `40596043469` (`f11cfbe`) SUCCESS |
| PR #103 | MERGED `f11cfbe` 2026-10-27T22:35:53Z; diff `aa6ba7d..f11cfbe` = solo `specs/19-…-progress.md` (+4/−4) |
| Congelación | `apps/api/src/schema-contracts.json` `f9a30cdc…562eac6c`; C16 135 y C17 145 objetos; `schemaVersion = 18` |
| SPEC21 / E3.6 | documentación integrada (`2364d9c`); 31 AC UNRUN; sin rama y sin DEV autorizado |
| Checkout principal | `codex/dev12-flujo-mensual` `e66bbd3` + `specs/session-handoff.md` sin seguimiento: ajenos, preservados sin tocar |

## Deuda documental de E4.1 no corregida por PR #103

PR #103 corrigió la cabecera y el bloque «Integración» del `progress`. Quedan cuatro
afirmaciones falsas o en tensión; **no se editan por inferencia** y su dueño es el flujo
DEV19 (`progress`/`testplan`):

| Archivo | Afirmación vigente en `main` | Realidad |
| --- | --- | --- |
| `19-…-progress.md` §Aceptación | «la decisión de merge es independiente y sigue pendiente» | PR #95 mergeada en `156a50d` |
| `19-…-progress.md` §DEV19 | «No queda trabajo de DEV19 pendiente» | sigue el seguimiento AC-30/AC-34 |
| `19-…-testplan.md` §303 | «la evidencia E2E completa en Linux no se ha ejecutado … requisito de merge» | run full Linux con 13 E2E, verde |
| `19-…-testplan.md` §338 | «La PR #95 sigue en draft; no hay merge» | mergeada, sin draft |

Alcance propuesto: cuatro frases, cero código, sin reabrir decisiones. Requiere autorización
y dueño identificado; no bloquea E3.6.

## Residuales E4.1 en seguimiento (Opción A, sin convertir a PASS)

| AC | Residual | Prioridad |
| --- | --- | --- |
| AC-30 | navegación completa por teclado y foco del panel de impacto no automatizados | alta |
| AC-34 | error 500 de fuente de efectivo no probado extremo a extremo | alta |
| AC-03 | carrera real de dos altas no ejecutada | documentada |
| AC-24 | rectificación en referencia temporal con QA temporal no versionada | documentada |
| AC-27 | snapshot de Presupuesto sin prueba versionada | documentada |
| AC-33 | variantes v16/v17 incompletas y tablas heredadas | documentada |

No se convierten a PASS sin DEV y QA. No se cuelan como trabajo implícito de E3.6.

## E3.6 — preparación, sin autorización de desarrollo

- **Documentación:** `specs/21-*` integrados; Q-S21-01–04 en opción A; 31 AC UNRUN; testplan
  completo y ninguna prueba ejecutada.
- **Alcance:** vista de lectura de pendientes y conciliación más flujo ajustado; **sin**
  migraciones, cambios de esquema, escrituras, cierres ni segundo maestro. API propuesta
  (`GET /api/pendientes`, `GET /api/pendientes/:tipo/:fuenteId`,
  `GET /api/conciliacion/ciclos/:id` y ampliación de `GET /api/flujo-mensual/:id`) pendiente
  de aprobación técnica.
- **Dependencias:** E3.1 PR71 (H1), E3.2 PR75/PR90/PR93, E3.4 y E2.3/E2.6 integradas; E3.5/DEV18
  en STOP ⇒ Comida y agregados de conciliación «No disponible» con motivo (AC-04/11/12/13/14/18
  con cobertura parcial); AC-31 BLOCKED por E4.8/E4.9; E3.3 no se consume.
- **Gates antes de DEV:** `main` en 18 y 19 libre; C16/C17 intactos; rama y worktree dedicados
  `codex/dev21-*` sin escritor previo; aprobación técnica de rutas; autorización DEV separada;
  QA independiente; sin despliegue.
- **Decisión pendiente del usuario:** autorizar DEV E3.6 con ese alcance y ese gate.

## Frentes detenidos

DEV18/E3.5 STOP (no reanudar); DEV17/E4.4 STOP; B3/DEV32 separados; SPEC20/DEV22 sin DEV;
PR50/PR51 sin tocar. Sin cambios por esta entrada.

## Governance y próxima acción

Una aprobación de spec no autoriza DEV; cada merge exige aprobación expresa. Esta entrada no
cambia permisos. **Próxima acción:** decisión del usuario sobre (a) merge de esta
consolidación, (b) DEV E3.6 con el alcance descrito y (c) dueño y prioridad de la deuda
documental de E4.1. Sin auto-reanudación.

## Contexto de reanudación

**STOP REQUESTED — NO AUTO-RESUME.** Esta entrada cierra la sesión de coordinación; no
reanuda ejecutores ni fusiona PRs.

- **Checkpoint:** este apartado. Rama `codex/docs-board-consolidated-20261027` (PR #104).
- **Ejecutores:** ninguno activo ni controlado por esta sesión; no se lanzaron workers.
  Chats externos, si existen, no son controlables desde aquí.
- **Evidencia:** `156a50d` (E4.1), `f11cfbe` (cierre documental), runs citados arriba,
  `specs/21-*` para E3.6.
- **Bloqueos:** deuda documental E4.1 pendiente de dueño; E3.6 sin autorización DEV;
  AC-30/AC-34 sin entrega fechada.
- **Próxima sesión:** verificar Git/PR y aprobaciones antes de proponer; este checkpoint no
  autoriza nada por sí mismo.

---

# DEV19 / E4.1 — INTEGRADO 2026-10-27 (22:36 CET)

Entrada vigente de E4.1; el apartado «Estado DEV19» inferior queda como historia previa al merge.

- **PR #95 MERGED** por squash: `main` pasa de `a7ded54` a **`156a50d`** (head validado `60162e9`).
- **CI del head final:** `required` `40593315701` SUCCESS (295 API / 0 FAIL); full
  `40593353747` SUCCESS (295 API, 13 E2E Playwright). CI del push a main en curso al escribir.
- **Contenido:** 59 archivos (+13.878/−87); `schemaVersion = 18`; manifiestos C16/C17 intactos
  (`f9a30cdc…`, C16 135/`9d9b0783…`, C17 145/`e0707d40…`).
- **Aceptación funcional:** 48 AC PASS / 6 PARCIAL aceptados como residuales documentados
  (opción A del usuario, 2026-10-27), sin convertirlos en PASS; prioridad AC-30 y AC-34.
- **Sin despliegue.** E3.6 no iniciado; DEV17, DEV18, B3 y DEV32 siguen detenidos o separados y
  no se reanudan por esta entrada.
- **Documentación pendiente de dueño:** `specs/19-…-progress.md` conserva la frase «PR #95 draft;
  sin merge»; corresponde al ejecutor DEV19 actualizarla en su siguiente retorno, sin reabrir
  decisiones.

---

# Estado DEV19 / E4.1 — 2026-10-27 (22:50 CET)

Actualiza el estado de E4.1; el resto de esta cabecera y la historia inferior se conservan.

| Elemento | Estado verificado por el coordinador |
| --- | --- |
| `origin/main` | `5f2b3de` (PR #97, #98, #99 y #100 documentales) |
| PR #95 | **Ready for Review** (no Draft), head `0760bfd`, `MERGEABLE/CLEAN`; incorpora `main` `5f2b3de`; **no integrada** |
| CI full | `40591547609` **SUCCESS** sobre `0760bfd`: 295 API / 0 FAIL, 13 E2E; `required` `40591549949` SUCCESS |
| QA independiente | **PASS** 48 AC / 6 PARCIAL / 0 FAIL / 0 UNRUN bloqueante. Evidencia sobre `dd450de`; `apps`/`tests` idénticos en `0760bfd` (solo documentación entre medias) |
| C16/C17 | Intactos: `f9a30cdc…`, C16 135/`9d9b0783…`, C17 145/`e0707d40…` |
| Decisión funcional | **Aceptada la opción A** por el usuario el 2026-10-27, tras consultar con Álex: los seis PARCIAL se mantienen como riesgos residuales documentados, sin convertirlos en PASS |
| Merge / deploy | **No autorizados**; PR #96 cerrada sin merge y no se reabre |

PARCIAL aceptados, sin convertir a PASS: AC-03 (carrera de dos procesos), AC-24 (rectificación en
referencia temporal), AC-27 (snapshot de Presupuesto), AC-30 (teclado/foco del panel),
AC-33 (variantes v16/v17 incompletas y tablas heredadas) y AC-34 (error 500 de efectivo en E2E).
Seguimiento con prioridad **AC-30** (accesibilidad) y **AC-34** (ruta de error 500) en el
`progress`/`testplan` de SPEC19, cuyo dueño es el ejecutor DEV19.

Pendiente antes de cualquier merge:

1. Integrar este tablero (PR #101) mediante su flujo y aprobación.
2. Aprobación expresa e identificable de la PR #95; sin despliegue.
3. E3.6 no inicia hasta cerrar E4.1; sin nuevo desarrollo por esta entrada.

---

# Coordinación global — estado consolidado 2026-10-27 (21:56 CET)

Sustituye como resumen vigente a los apartados inferiores, que se conservan como historia.
Responsable único del tablero: coordinador global (sesión OpenCode). Esta entrada vive en la
rama `codex/docs-global-board-20261027`, en PR propia; su integración exige aprobación expresa
del usuario. Solo el coordinador escribe este archivo; no se crea rama competidora. Los
mensajes a ejecutores se trasladan manualmente por el usuario; un envío significa ESPERANDO
RETORNO y no acredita ejecución.

## Hechos verificados por el coordinador

- `origin/main` = `2364d9c20439b865edeffcb5f661e4125778aa03` (squash PR #97, base `9977210`).
  Diff `9977210..2364d9c`: solo altas `specs/21-pendientes-conciliacion-{brainstorming,
  progress,specification,testplan}.md`; sin código, SQL, migraciones, tablero ni otros specs.
  Árbol idéntico al HEAD de la PR `132caf1` (`git diff` vacío). Runs `40573819145` (PR97) y
  `40579993282` (push main) SUCCESS; único workflow declarado `validate.yml`.
- PR #97 MERGED. El `progress` integrado conserva la línea previa al merge («PR #97 publicada;
  sin merge»); corregirla requiere PR documental posterior, no ejecutada.
- PR #95 (E4.1/DEV19): OPEN **Draft**, head `78755c6`, base `main`, **no integrada**. Candidato
  v18 con 59 archivos (~13.846 líneas: API, UI `Inversiones`, tests, E2E). Manifiestos
  congelados comprobados por el coordinador en `78755c6`: `schema-contracts.json` SHA-256
  `f9a30cdcf0d3…562eac6c`, 5 contratos, C16 135 objetos/`9d9b0783…`, C17 145
  objetos/`e0707d40…`. Job `required` SUCCESS en `261d2fb`, `b0969c8` y `78755c6` (FAIL previo
  en `8e9ce67`); **no hay run full/E2E** en la rama y la propia PR reconoce E2E Linux completo
  sin ejecutar como requisito de merge.
- Autorización **histórica** de DEV19: **no acreditada**; no se registra por inferencia. El
  usuario autoriza expresamente el 2026-10-27 la **continuidad controlada de DEV19**, limitada
  al alcance funcional v18 ya definido en SPEC19 rev10: revisar/completar la implementación
  existente, resolver incidencias del alcance y ejecutar las verificaciones, pruebas y QA
  pendientes. Condiciones: confirmar ownership y coordinación con el ejecutor de E4.1;
  preservar C16/C17 congelados y lo integrado en main; completar E2E Linux x86_64, migraciones,
  backup/restore y AC aplicables; mantener PR #95 en Draft hasta superar los gates; **sin merge
  ni despliegue**; sin ampliar alcance ni tocar otras entregas. Es **prospectiva**, no prueba de
  una autorización anterior.
- PR #96 (`codex/board-c16c17-freeze`, `a76e577`, +19 líneas en `specs/epic-board.md`): abierta
  fuera del ownership del coordinador y con estado contradictorio (afirmaba DEV19 no autorizado
  y schema 18 no implementado). **Cerrada sin merge** el 2026-10-27 por autorización expresa y
  tras contrastar su contenido; D5 integrada en `cf6954a`, congelación C16/C17 y gate DEV18
  quedan recogidos aquí. No se crea rama competidora.

## Frentes y límites vigentes

| Frente | Estado verificado o retorno registrado | Límite / siguiente acción |
| --- | --- | --- |
| DEV19 / E4.1 | Continuidad autorizada (prospectiva); PR #95 Draft, gates completos pendientes | Entregar autorización al ejecutor, confirmar ownership y recibir evidencia; sin merge |
| SPEC21 / E3.6 | Documentación aprobada e integrada (`2364d9c`); E3.6 **sin iniciar**; Q-S21-01–04 aprobadas, no se reabren | Prioridad posterior a DEV19; DEV E3.6 exige autorización separada |
| SPEC22 / E4.2 | Retorno recibido: rev2 propuesta, D1–D7 = A, Q0 resuelta; wireframes pendientes de aprobación visual; DEV22 no iniciado | Rev3 **solo wireframes** autorizada; aprobación visual del usuario; publicar exige reconciliar enlaces a `specs/19-*` (ausente en main hasta integrar PR95) |
| SPEC20 / E4.5 | Aprobada documentalmente; PR87 Draft `fc48f19`, último CI conocido FAIL; DT7 con informe propio sin seguimiento en su worktree | DEV no autorizado; DT7 esperando retorno; no copiar/mover/commitear su informe |
| INV-DT5 | Encargo enviado; worktree limpio en `9977210` y sin informe | Esperando retorno; no duplicar ejecutor |
| DEV18 / E3.5 | STOP; ARM64 PASS con salvedad, x86_64 BLOCKED; candidato `568bf3e`, doc `94cb6a0`; handoff principal SHA-256 `38e721da…a090e8` | NO AUTO-RESUME; sin reintentos ni publicación |
| DEV17 / E4.4 | STOP en `b62ca8c`, sin código | Secuencia D5→E4.1→DEV17; sin reanudación |
| B3 / DEV32 | Abiertos y separados; PR30 Draft `24ca206` | No reanudar por inferencia |
| PR50 / PR51 | Abiertas antiguas, no Draft | Sin autorización; no tocar |

Cerrados y no reabiertos por esta entrada: DEV12/PR67, PR94, D5/PR90, PR93, PR92/CI, DEV13/H1
(AC36 PARCIAL y conciliación documental pendientes), DEV15/E3.3 y SPEC31 (cierre administrativo
por reconciliar).

## Governance y próxima acción

Una aprobación de spec no autoriza DEV; cada merge exige aprobación expresa de su PR; ningún
handoff concede publicación, CI remoto, infraestructura, datos reales ni despliegue. Esta
actualización no cambia permisos. El reparto orquestador técnico (OpenCode), asesor (Álex) y
usuario quedó formalizado en `specs/methodology/myfinanzas-coordination.md` y `AGENTS.md`
(PR #98, `6308ad1`). El checkout principal (`codex/dev12-flujo-mensual`, `e66bbd3`) y
`specs/session-handoff.md` son ajenos y no se tocan.

**Próxima acción:** trasladar al ejecutor E4.1 la autorización de continuidad y pedir retorno con
ownership, plan de gates y evidencia; sin abrir otros frentes ni fusionar PRs.

---

# HANDOFF GLOBAL — STOP REQUESTED — NO AUTO-RESUME

Fecha: 2026-10-27. Task/sesión: coordinación global MyFinanzas, Codex SUPERVISOR.
Usuario invoca `$handoff` para trasladar coordinación a DeepSeek. Esta parada solo
alcanza esta sesión; no detiene ni reanuda sesiones externas. El checkpoint no
concede desarrollo, publicación, CI, infraestructura, datos reales ni merges.

## Identidad y persistencia

- Repositorio privado `jmartinlabs/myfinanzas-app`.
- Rama propia: `codex/docs-global-board-20261027`.
- Checkout aislado reutilizado del frente CI ya cerrado:
  `/private/var/folders/45/l03g6c0x15748l6t9c0f7zm80000gp/T/opencode/ci-merge-base-lineage`.
- Commit previo: `1699d83e81de1a420da65e9e68d6c17a7dc69d81`, reconciliación del
  tablero y numeración SPEC01–32. El commit que contiene este bloque será el HEAD
  posterior; verificar con `git log -1`. Solo se modifica este tablero.
- Base/main remoto observado sin fetch en el último preflight: `9977210095472de43a9abf59587ea88587376074`.
- Rama local sin push/PR; portabilidad remota **NO VERIFICADA**. No merge autorizado
  para este tablero. Baseline sobre reconciliación previa1699d83 PASS; este handoff
  solo inspección de diff/whitespace, sin nuevas pruebas/CI.
- Checkout principal ajeno: rama `codex/dev12-flujo-mensual`, HEAD e66bbd3;
  único pendiente observado `specs/session-handoff.md` sin seguimiento, propiedad del
  retorno DEV18-LINUX. Preservado sin edición/commit en esta sesión.

## Modelo de coordinación vigente y encargos

El usuario elimina los chats supervisores intermedios. Un coordinador global
prepara paquetes y reconcilia retornos; cada sesión DeepSeek orquesta su tarea
con harness y revisión independiente según permisos. Traslado manual por usuario.
No asumir mensajería, supervisión o control directo de otras sesiones.

- **SPEC21/E3.6:** usuario confirmó trabajando; actualización de coordinación enviada.
  Solo documentos propios SPEC21, sin código ni CI/publicación. No duplicar ejecutor.
- **INV-DT5:** encargo enviado confirmado; inventario de escrituras para futuros
  SPEC26/E4.8 y SPEC27/E4.9. Lectura de código, escritura limitada a informe
  `specs/investigations/dt5-write-impact-inventory.md`; sin reglas financieras nuevas.
- **PREP-DT7:** encargo enviado confirmado; preparación documental/ficticia para
  E4.5, informe propio con ownership comprobado. Sin Excel/datos reales/importador.
- **E4.1-OWNERSHIP-C16C17:** continuidad a la sesión existente enviada confirmada.
  Usuario autoriza asunción temporal limitada de archivos identificados y congelación
  reproducible C16/C17 en pilot-e41, condicionada a ausencia de ownership incompatible
  y repetición del inventario. NO autoriza reconciliación del código histórico,
  migración/DEV funcional v18, publicación/CI remoto/merge/deploy. Parche rev10 y
  testplan aprobados; conservar documentos locales modificados. Revisión independiente
  del candidato de manifiestos antes de otra fase. No afirmar ejecución completada.
- **SPEC22/E4.2:** paquete preparado para Ventas/posición/efectivo de bróker;
  **PENDIENTE DE ENVIAR**, no hay confirmación explícita. Solo documentos22, lectura
  SPEC19 aprobada, sin reserva esquema, código/CI/publicación. Confirmar antes de asignar.

Paquetes exactos en conversación de origen y sesiones de destino; no ampliar por
este resumen. Enviados significa ESPERANDO RETORNO, no demuestra proceso activo.
Único agente nativo al handoff: coordinador/root; sin subagentes ni comandos en curso
controlados por esta sesión. DeepSeek/OpenCode externos: **NO CONTROLADOS**, estado
actual no confirmado; si el usuario quiere detenerlos debe hacerlo en sus clientes.
No se les solicita parada ni se transmite mensaje por este handoff.

## Último gate DEV18-LINUX / E4.1

DEV18-LINUX archivado, STOP, x86_64 BLOCKED por entorno y sin reintentos automáticos.
Handoff existente en checkout principal `specs/session-handoff.md`, SHA256 verificado:
`38e721dac1bc0ad543b2ba7fc24ad5645300f257c7078b389a4031c069a090e8`.
Declara sin escritor DEV18, workers o procesos de verificación. Esta evidencia
resuelve el dato de actividad pendiente del preflight, no es cesión general de D5.
Candidato568bf3e, HEAD documental auditado6f47072, rama real94cb6a0, worktrees/clon
limpios. ARM64 PASS suplementario con fallback (295API/13E2E); x86_64 UNRUN/BLOCKED.
QA18 39PASS/4BLOCKED, FIN_NETA ausente, AC12/13/17/39 BLOCKED. No aceptación global.

Preflight leído en host sin fetch/pruebas: evidencia/dev18-linux-qa/repo en568bf3e;
VM parada registrada19:11:46 Europe/Madrid; no procesos DEV18/pruebas identificados.
Servidor general OpenCode PID77068 cwd usuario no demuestra ejecución DEV18.
154refs locales/remotas almacenadas y98ramas remotas consultadas con ls-remote,
todos sus commits ya locales; sin declaración código schemaVersion18+ encontrada.
Propuesta documental18 pertenece E4.1. Inventario es evidencia puntual, repetir
antes de escribir. pilot-e41 HEAD064df64, dos documentos19 modificados, preservados.
No se ejecutó congelación C16/C17 aquí. Confirmación de recepción de este retorno
por ejecutor E4.1 no acreditada; contrastar antes de duplicar mensajes.

## Decisiones y límites conservados

- DEV12/PR67 y PR94 cerrados/integrados; no repetir QA ni reabrir por AC futuros.
- PR92 integrada1cc83f4 por autorización expresa y ejecutada aquí: required40549455121,
  full40550235588 (270API/12E2E), posmerge40551379119 PASS. PR93 integradaf702e9b;
  D5/PR90 integradacf6954a. Sus resultados no se transfieren a PR87/DEV18.
- DEV13 PR71 integrada b146edae, H1c137bae intacto. QA posmerge favorable comunicada;
  AC36 PARCIAL/proveedor Cierres ausente; UI relacionados fuera de H1. Conciliación
  documental de progress/testplan13 propuesta, no ejecutada aquí.
- SPEC19 rev10 aprobada literalmente por usuario; SHA256 de parche
  `71e4d951974c1fe468991771bbc8161ee44f0faf30470634d0f7e351ae8a4bb1`, QA independiente
  PASS con6hallazgos CLOSED. G3PASS/G4condicional; C16/C17 físicos/canónicos y
  ownership requieren cierre según paquete limitado, sin reabrir decisiones.
- SPEC20 aprobado íntegro27Oct,47AC/QA docsPASS; PR87 Draftfc48f19, último CI propio
  conocido40509128613 FAIL; DT7 pendiente, DEV no autorizado.
- DEV17 b62ca8c sin código; spec/wireframes y autorización histórica conservados,
  STOP NO AUTO-RESUME. Secuencia D5→E4.1→DEV17; integración aprobada E4.1, cesión,
  gate main/dependencias/escritores/versión y nueva autorización expresa de inicio.
- B3 abierto, investigación inconclusa por montaje, NO AUTO-RESUME; DEV32 PR30 Draft,
  AC18/22 y compatibilidad pendientes. Sin infraestructura/VPS/deploy/datos reales.
- SPEC21–30 numeración asignada a las entregas del registro inferior. No números
  nuevos por analogía ni reglas financieras inventadas.

## Riesgos y una siguiente acción segura

Historial de resets del checkout principal17:57:49/17:58:29/18:22:41, autor y modo
no acreditados; resumen local desapareció. Esta rama reconstruye desde evidencias,
no afirma recuperación byte a byte. No reset/limpieza ni apropiación del principal.
La copia DEV18 del handoff es local/no versionada: preservar antes de otro cambio.

**Siguiente acción segura del nuevo coordinador:** inspeccionar esta rama/checkpoint,
Git drift y aprobaciones y devolver un diagnóstico actualizado antes de proponer
continuidad; confirmar estado de los encargos ya enviados, sin duplicarlos ni
reanudar automáticamente otros frentes. El usuario abre la nueva sesión manualmente.

---

# Coordinación global — checkpoint vigente 2026-10-27

Responsable único de este tablero: coordinador global. Este resumen sustituye los
estados históricos inferiores por frente; la historia se conserva. No reasigna
ownership de producto ni concede permisos de desarrollo, CI, publicación o merge.

Base de esta reconciliación: `origin/main` y PR94 verificados en
`9977210095472de43a9abf59587ea88587376074`. PR71 y PR92 verificadas integradas.
Las aprobaciones y QA externas indicadas se registran como retornos del usuario,
no como nuevas ejecuciones de este coordinador. No repetir pruebas por este registro.

## Registro SPEC / entrega / desarrollo

SPEC21–SPEC30 asignadas expresamente por el usuario en esta coordinación; no son
expedientes redactados ni autorización de inicio. Se recupera aquí la asignación
que solo constaba en un resumen local desaparecido. No renumerar las existentes.

| SPEC | Entrega | Alcance | Especificación | Desarrollo / entrega |
| --- | --- | --- | --- | --- |
| SPEC01 | E1.1 | Saldos y control | Aprobada/integrada | Integrado |
| SPEC02 | E1.2 | Clasificación | Aprobada/integrada | Integrado |
| SPEC03 | E1.3 | Ciclos mínimos | Aprobada/integrada | Integrado |
| SPEC04 | E1.4 | Movimientos | Aprobada/integrada | Integrado |
| SPEC05 | E1.5 | Transferencias y Referencias | Aprobada/integrada | Integrado |
| SPEC06 | E1.6 | Deuda mínima | Aprobada/integrada | Integrado; contratos futuros separados |
| SPEC07 | E2.1 | Operación de Ciclos | Terminada/aprobada/integrada | Integrado; contratos futuros separados |
| SPEC08 | E2.2 | Presupuestos | Aprobada/integrada | Integrado |
| SPEC09 | E2.3 | Plan del ciclo | Aprobada/integrada | Integrado |
| SPEC10 | E2.4 | Plan anual | Aprobada/integrada | Integrado |
| SPEC11 | E2.5 | Nómina y previsión | Aprobada/integrada | Integrado |
| SPEC12 | E2.6 | Flujo mensual base | Aprobada/integrada | CERRADO/INTEGRADO PR67 a445f908; reconciliación PR94 9977210 |
| SPEC13 | E3.1 | Anticipos | Rev3+Q9/H1 integradas | INTEGRADO PR71 b146edae; QA posmerge favorable comunicada, cierre documental pendiente; AC36 PARCIAL |
| SPEC14 | E3.2 | Compartidos | Aprobada; D5 integrado | D5 PR90 cf6954a y overflow PR93 f702e9b integrados; D5-AC13 parcial/B-T11 UNRUN conservados |
| SPEC15 | E3.3 | Vehículos e ITV | Integrada según historial | Integrado según historial; retorno final administrativo por consolidar |
| SPEC16 | E3.4 | Revisión bancaria de Comida | Aprobada/integrada | CERRADO/INTEGRADO PR82 26b6f0c; AC25 futuro y contratos E3.5 separados |
| SPEC17 | E4.4 | Deuda completa | Spec/wireframes aprobados | Sin código; autorización histórica conservada, STOP/NO AUTO-RESUME; depende de E4.1 |
| SPEC18 | E3.5 | Comida y compensaciones | Rev7 aprobada según checkpoint | CIERRE TÉCNICO LOCAL, QA18 PASS CON SALVEDADES; no publicado/integrado/aceptado funcionalmente |
| SPEC19 | E4.1 | Instrumentos y Compras | Rev10 y testplan aprobados expresamente | Código histórico congelado064df64; nuevo supervisor conciliando gates, sin DEV activo confirmado |
| SPEC20 | E4.5 | Histórico precontrol | CERRADA DOCUMENTALMENTE/APROBADA | DEV no autorizado; PR87 Draft, FAIL conocido sin nueva evidencia propia; DT7 pendiente |
| SPEC21 | E3.6 | Conciliación transversal | Número asignado; no iniciada | No iniciado |
| SPEC22 | E4.2 | Ventas y efectivo de bróker | Número asignado; no iniciada | No iniciado |
| SPEC23 | E4.3 | Valoración y resultados | Número asignado; no iniciada | No iniciado |
| SPEC24 | E4.6 | Resumen de inicio | Número asignado; no iniciada | No iniciado |
| SPEC25 | E4.7 | Resumen Anual y flujo completo | Número asignado; no iniciada | No iniciado |
| SPEC26 | E4.8 | Precierre | Número asignado; no iniciada | No iniciado |
| SPEC27 | E4.9 | Cierre y primera fotografía | Número asignado; no iniciada | No iniciado |
| SPEC28 | E4.10 | Reapertura y nuevo cierre | Número asignado; no iniciada | No iniciado |
| SPEC29 | E4.11 | Fotografías consultables | Número asignado; no iniciada | No iniciado |
| SPEC30 | E4.12 | Recuperación integral | Número asignado; no iniciada | No iniciado |

Técnicas: **SPEC31 SQLite producción**, contrato aprobado e implementación/enmienda
presentes en main, cierre administrativo por reconciliar; **SPEC32 rootless**, PR30
Draft, candidato24ca206, AC18/AC22 y compatibilidad con main actual pendientes.
B3 sigue ABIERTO, investigación cerrada inconclusa por montaje; último checkpoint
comunicado62d4bec, checkout observadoe6a4a0c. No reanudar B3 ni DEV32 por inferencia.

## Cierres y evidencias vigentes

- **DEV12:** PR67 MERGED a445f908, candidatoe66bbd3; QA12-CLOSE favorable y
  CI40243368188 SUCCESS según retorno. PR94 documental MERGED9977210, candidato
  405e58a y CI40551580591 SUCCESS según retorno; integración contrastada GitHub.
  Conserva56AC, UNRUN condicionados AC14/16/17/19/26/43 y AC47 de motores futuros.
  No reabrir DEV12 ni repetir QA: estos límites no impiden su cierre.
- **DEV13/H1:** PR71 MERGED b146edae, H1c137bae preservado y ancestro del main
  conocido. QA posmerge favorable comunicada: Anticipos22/22,199aserciones,
  fixture amortización4/4 y E2E locales Anticipos/Compartidos PASS. CI posmerge
  PR71 PASS comunicado; full sobre f702e9b UNRUN. Evidencia posterior separada:
  full PR92 sobre2384ae2 PASS270API/12E2E, sin cambios propios Anticipos frente a
  f702e9b. No convierte AC36 PARCIAL/proveedor real Cierres ausente en PASS.
  UI relacionados excluida de H1. Progress/testplan13 en main mantienen etiquetas
  obsoletas QA/CI pendientes/no integrado: conciliación documental propuesta,
  no ejecutada aquí. No nueva aceptación financiera ni restore operativo inferidos.
- **DEV-D5-OVERFLOW:** PR93 MERGEDf702e9b, candidato4432e17; fix focal CSS/E2E
  sin cambio financiero/esquema. Integración verificada previamente; no sigue activo.
- **PR92/CI:** MERGED1cc83f4, candidato2384ae2 sobref702e9b. Baseline local PASS,
  revisión independiente del supervisor favorable; required40549455121 PASS,
  full40550235588 PASS (270API/SQLite,3872aserciones,12E2E), posmerge40551379119
  PASS. Comprobados por este coordinador; checkout aislado limpio al cierre.
  Frente cerrado. Su verde NO acredita PR87 ni autoriza reactivarla.

## Frentes pendientes y próximos gates

- **DEV18:** cierre técnico local según retorno: código568bf3e, documental6f47072,
  main integradof702e9b; QA18 independiente PASS CON SALVEDADES,39PASS/4BLOCKED/
  0FAIL/0UNRUN; check-evidence con registro PASS local. AC12/13/17/39 BLOCKED por
  FIN_NETA runtime ausente. N4/N5, recuperación de paginación y fingerprint son
  deuda menor sin otra ronda inmediata. No publicado/integrado/aceptado funcionalmente.
  Inspección posterior detecta HEAD94cb6a0 en la rama: no atribuirle por inferencia
  la evidencia de6f47072. Siguiente paquete DEV18-LINUX preparado a petición del
  usuario: verificación canónica Debian13/glibc aislada y contraste del main actual;
  envío/inicio NO confirmados. Sin nuevas correcciones, push, PR, merge o deploy.
- **E4.1/SPEC19:** usuario aprueba literalmente «Apruebo SPEC19 rev10 y su testplan
  para E4.1/v18». Parche SHA25671e4d951974c1fe468991771bbc8161ee44f0faf30470634d0f7e351ae8a4bb1;
  QA independiente PASS,seis hallazgos CLOSED según retorno. Rama piloto064df64,
  cambios documentales locales observados y preservados. Nuevo supervisor creado
  por el usuario y mensaje enviado; encargo de lectura. Faltan C16/C17 canónicos,
  cesión D5 de alcance E4.1, checkpoint por owner y revalidación destino18 antes de
  adaptar. Cesión anterior para overflow NO es cesión general a E4.1. DEV detenido;
  no reserva definitiva ni autorización de implementación/publicación por aprobación.
- **DEV17:** checkpointb62ca8c, sin código ni candidato funcional. Spec/wireframes
  aprobados y autorización histórica conservados; sesión DeepSeek cerrada. Secuencia
  D5→E4.1→DEV17; espera integración aprobada y cesión explícita E4.1, nueva instrucción
  de continuación y gate main/dependencias/ownership/versión. STOP NO AUTO-RESUME,
  sin reservar esquema ni reabrirQ1–Q7. Mensaje de lectura al supervisor preparado;
  envío no confirmado, sin reanudación del ejecutor.
- **E4.5/SPEC20:** aprobación íntegra spec/wireframes27Oct según usuario, Q1–Q10
  confirmadas,47AC, QA documental y verify docsfc48f19 PASS comunicados. PR87 Draft
  fc48f1984130b99993dce60e12a555752fa8396d; último CI conocido40509128613 FAIL
  por contexto base/merge ref. No sustituirlo con PASS PR92. DT7 pendiente: solo
  preparación documental/ficticia; sin Excel, datos reales ni conciliación operativa.
  Sin autorización DEV/merge. No reapertura funcional salvo contradicción material.

## Ownership, continuidad y ejecución

DeepSeek ejecuta tareas; cada encargo tiene un chat supervisor; este coordinador
consolida dependencias, prioridades y tablero. Última confirmación del usuario:
ningún ejecutor activo. Mensaje preparado/enviado no demuestra sesión iniciada.
Responsables por frente: supervisores DEV12,DEV13,DEV18,E4.1,DEV17 y SPEC20;
identidad de escritores externos y disponibilidad deben contrastarse antes de escribir.
Solo coordinación documental activa aquí; no se controlan sesiones externas.

Incidencia separada del checkout principal: reflog registra resets27Oct17:57:49,
17:58:29 y18:22:41 (Europe/Madrid). No acredita ejecutor ni modo. Resumen local del
coordinador dejó de aparecer; no se encontró copia en tableros de worktrees ni stash.
No atribuir responsabilidades, limpiar ni restaurar archivos ajenos por inferencia.
Esta reconciliación se prepara en rama/checkout aislados, sin modificar el principal,
DEV13, DEV18, E4.1 ni sus documentos. Se reconstruyen estados desde retornos/evidencias,
no se afirma recuperación byte a byte del cambio desaparecido.

---

## Historia preservada — checkpoints anteriores, no estado vigente

## Current checkpoint — DEV14 Base B v15 en PR75 — 2026-10-26

Continuación autorizada de Base B (E3.2) sobre PR75, sin merge ni despliegue.
El candidato de código `e4ff2df` integra main `f5bf032`/DEV15 y resuelve la
colisión de esquema: v14 pertenece a Vehículos y Base B avanza a v15. Desde v13
se ejecutan ambos contratos; una v14 sin `fichas_vehiculo` se rechaza. Backup
distingue `e3.3-v14`/`e3.2-v15`. Typecheck/build, focales
Compartidos/Vehículos/Anticipos, migraciones v13/v14, E2E y QA independiente
están en verde local (APTO con H1/O1/H2 cerrados); la suite API macOS conserva
fallos de plataforma y B3 heredado. CI Linux del SHA final sigue pendiente;
B-T11 y D5 no se declaran PASS. No hay merge/deploy.

---

## Current checkpoint — PR71 integración documental con main — 2026-10-25

Usuario autoriza comprobar/resolver integración de PR71 y validar CI, sin merge
hacia main. `main` verificado36321da, candidato H1 previoa0e0567. Conflicto
reproducido únicamente en specs/epic-board.md; se conserva abajo el tablero
más reciente del coordinador234dbbd. Commits/autoría H1 originales preservados.
Sin cambios a lógica financiera, pruebas, guardas o workflows en esta resolución.
Rutas personales del checkpoint local sustituidas por referencias portables.
Se incorporan los documentos ya integrados PR72/73; desarrollo14 no autorizado.

Próximo: baseline del merge local y publicación en PR71; después verificar que
refs/pull/71/merge corresponde al nuevo HEAD y ejecutar CI Linux. CI previa
40239847535 FAIL antes de aplicación, no PASS; QA independiente pendiente,
AC36 PARCIAL/Cierres UNRUN. B3/Dev32 fuera. Sin OpenCode/agentes externos,
datos reales o despliegue; PR71 sigue DRAFT y sin aprobación de merge.

---

## Current checkpoint — DEV13-H1 publicado, CI bloqueada — 2026-10-25

Reemplaza el resumen vigente anterior; historia preservada. Usuario pide seguir
por aquí, sin OpenCode ni agentes externos. Solo continúa revisión/publicación
acotada DEV13-H1/CI; no reanuda ejecutores ni amplía desarrollo.

- Coordinador: checkout `/private/tmp/myfinanzas-spec14-publication`, rama
  `codex/comms-v210-integrated`; checkpoint previo46cd6b4 preservado, sin push.
  Main remoto verificado36321da; PR72/73 integradas; B3 sigue abierto/fuera.
- DEV13-H1/CI (OpenCode, sesión funcional del mismo nombre, ID/versionN/D):
  sin retorno externo final nuevo. Coordinador verificó delta y publicó íntegros
  7339b5e/1881576/a0e0567 en rama remota `codex/dev13-anticipos-q9`, PR71 DRAFT,
  HEADa0e056722ecba0ccaeb7ce4498a72c48bebd88aa. Autoría original y resolución
  de Álex preservadas; checkout externo `.../T/opencode/dev13-h1` limpio.
- Verificación propia macOS/Bun1.4.3: Anticipos22PASS, cinco H1 incluidos;
  conjunto Anticipos/Referencias30PASS/3FAIL. Con age en PATH, backup falla en
  guarda Ancestro no confiable; R11 falla por ruta del stack Bun, reproducido
  también en base1255ef8. Sin cambios de guardas/assertions. TypecheckPASS;
  baseline canónica Python3.12 PASS57/24/9/8/15; diff/historial revisados.
- CI [40239847535](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/40239847535)
  del HEADa0e0567: baseline/requiredFAIL, fullSKIPPED. Log baseline121309105938:
  `ci_context.py snapshot` rechaza checkout refs/pull/71/merge6261d54, que integra
  antiguo1255ef8 con fa8a01e. Pruebas Linux de aplicación UNRUN en este candidato.
  No rerun ni diagnóstico ampliado. PR actualizada con evidencia y limitaciones.
- Próxima acción segura DEV13: resolver discrepancia de referencia de integración
  bajo política de conflictos/CI antes de nueva validación; sin relajar guardas.
  QA independiente pendiente; AC36PARCIAL/CierresUNRUN; merge no autorizado.
- QA12-CLOSE: PENDIENTE DE ENVIAR según último checkpoint, no contactar ahora.
  PR67 DRAFT/remotobb24934, CI40191028155SUCCESS reconsultada; localc971ff4
  limpio preservado. Sin informe nuevo ni aprobación de merge.
- Spec14 integradaPR72/36fd238,39AC; desarrollo14 NO autorizado. D5/Exterior
  abierto. Sin B3/Dev32, datos reales, Excel, VPS/deploy, nuevos ejecutores o
  mensajes externos. Comentarios PR67/71 sin retornos nuevos al contraste.
- Cuota consultada al inicio:65%5h/48%semanal restantes. Sin nueva delegación.

---

## Current checkpoint — STOP REQUESTED — NO AUTO-RESUME — 2026-10-25

Usuario invoca `$handoff`: alcance congelado. No QA, desarrollo, investigación,
PR, merge, despliegue ni nuevas asignaciones durante esta parada.

- Repo `jmartinlabs/myfinanzas-app`, checkout coordinador
  `/private/tmp/myfinanzas-spec14-publication`, rama `codex/comms-v210-integrated`.
  HEAD previo `36321da40f04bb3a0e94c8be5a22234d72907b43`, limpio al inventario.
  Este resumen se guarda en commit local de checkpoint, sin push. Ruta temporal:
  portabilidad remota del checkpoint NO VERIFICADA; fuente integrada sí en GitHub.
- COMMS-PR24 COMPLETADO: usuario integró PR73, merge36321da verificado; adaptación
  selectiva harnessv2.10.0 (upstream f43d691, tag46c07e7), no scorer/evals.
  Baseline local y remotoPASS; fullLinux del HEAD5f6889e FAIL168PASS/1FAIL,
  B3 SQLite disk I/O error (run40238031354). Merge no convierte CI en PASS,
  B3/Dev32 sigue abierto y fuera de alcance; sin reejecución ni diagnóstico.
- Prefijo externo `.../T/opencode/` =
  `<raiz-temporal-opencode>/`.
- DEV13-H1/CI (OpenCode, sesión funcional DEV13-H1/CI; ID/versionN/D):
  ESPERANDO RETORNO, estado de ejecución/parada externo UNCONFIRMED. PR71
  OPEN/DRAFT al último contraste, remoto1255ef8; Linux183PASS/3FAIL en
  schema12→13 (run40218101424). Candidato autor6e8dad3/docs8710916: focal17/158,
  tipos/build/baseline y E2E1/22PNG PASS; applicationmacOS141/45FAIL conservados.
  QA externa no apto merge. Corrección autorizada: preservar compatibilidadE1.5,
  separar Gastos/Ingresos relacionados fuera del motor sin degradar cobertura;
  solo Transferencias acreditadas actúan Adelanto/Devolución. Históricos/inactivas
  preservados, amortizaciones sin ampliar contrato. AC36 PARCIAL/CierresUNRUN.
  Checkout externo `.../T/opencode/dev13-h1` inspeccionado limpio, rama
  `codex/dev13-anticipos-h1`, HEADa0e0567; schemafix7339b5e local. Nuevo commit
  documental observado NO acredita implementación H1 ni QA. Sin retorno final
  ni push confirmado. No mergePR71 autorizado. [Progreso base](https://github.com/jmartinlabs/myfinanzas-app/blob/1255ef88bb196c8326f7794aa79b1c4715aa0e0a/specs/13-anticipos-progress.md)
  vive en rama de PR71, no en este main; consultar por SHA remoto.
- EXT-OPENCODE-QA12-CLOSE (OpenCode, sesión funcional QA12/PR67, ID/versionN/D):
  PENDIENTE DE ENVIAR, envío de nuevo paquete no confirmado. PR67 OPEN/HEADbb24934
  al último contraste; CI40191028155 SUCCESS previamente verificada. Informe
  antiguo favorable condicionado comunicado, falta nuevo informe verificable
  de cierre. Principal `<checkout-principal>` conserva
  rama `codex/dev12-flujo-mensual`, HEADc971ff4 local sin push, limpio. No merge
  aprobado ni reanudación del autor. [56AC](12-flujo-mensual-specification.md).
- EXT-OPENCODE-SPEC14 COMPLETADO:39AC aprobados e integrados PR72/36fd238,
  publicación50c0d64 idéntica a documentos aprobados OpenCodec2cf298.
  Checkout original `.../T/opencode/spec14` limpio, rama `codex/spec14-compartidos`,
  HEADc2cf298 sobre a5f9400. Pausa antigua superada solo por instrucciones
  documentales posteriores; esta nueva parada vuelve a congelar. Desarrollo14
  NO autorizado. D5/Exterior BLOQUEADO: falta contrato/autorización específicos,
  E3.2 no funcionalmente completa. [Spec14](14-compartidos-specification.md).
- Runtime controlado: dev13, dev13_q9, spec14_m_review COMPLETED; ningún ejecutor
  nativo activo aparte del coordinador que guarda este checkpoint. No se
  envían mensajes ni se afirma parada de OpenCode: inicio/parada/traslado manual
  corresponden al usuario. Pedir a sesiones externas activas que paren y devuelvan
  HANDOFF → CODEX completo con Task ID/sesión antes de reasignar.
- Preservados sin limpieza: checkoutdev13 `/private/tmp/myfinanzas-spec13-q9-review`
  HEAD1255ef8 limpio; copia documental duplicada spec14
  `/private/tmp/myfinanzas-spec14-coordination`, HEADa5f9400, cambios sin commit
  en brainstorming14/specification14 (solo referencia, NO publicar). Antiguo
  `/private/tmp/myfinanzas-spec13-rev2-codex`, HEAD500a385, cambios sin commit
  en brainstorming13/progress13/specification13/epic-board (históricos, no candidato).
  No reset/stash/borrado ni sustitución de autoría OpenCode.
- Política: identidad estable Task ID+sesión, estados manuales con procedencia,
  retorno completo en cada seguimiento y acción humana explícita según
  [comunicación](methodology/coordinator-communication.md). No inventar modelo
  OpenCode (catálogo no recibido), cuota o IDs. Techo Codexgpt-6.1-sol/low y
  gates25%/5% vigentes; cuota de próxima sesión requiere lectura actual.
  B3/Dev32, datos reales, Excel, VPS/deploy fuera; no approvals nuevos por handoff.
- **Una próxima acción segura:** nuevo coordinador inspecciona este checkpoint,
  Git/PR/SHA/cuota y retornos externos disponibles antes de proponer continuidad.
  No reanudar, asignar QA o hacer merge por inferencia.

Este es el único resumen vigente; debajo se conserva historia, sin nueva autorización.

---

## Current checkpoint — sincronización comunicación v2.10.0/PR24 — 2026-10-25

Resumen vigente del coordinador; reemplaza etiquetas actuales de los apartados
históricos inferiores. Sin reanudación de trabajo ni nuevas asignaciones.
Main verificado `36fd238` (PR72); harness v2.9.0 con adaptación documental selectiva upstream v2.10.0/PR24
`f43d691`; tag anotado verificado46c07e7→f43d691. Sin adopción de scorer/evals.

| Task ID / nombre | Cliente y referencia de sesión estable | Estado y procedencia | Última evidencia, gates y siguiente acción |
| --- | --- | --- | --- |
| EXT-OPENCODE-DEV14-BASEB · Base B E3.2 | Coordinador OpenCode, checkout aislado `.../T/opencode/dev14-baseb`; autor previo con HANDOFF | QA INDEPENDIENTE APTO / CI LINUX PENDIENTE — PR75 OPEN | Código `e4ff2df` (merge main `f5bf032`/DEV15 + fixes QA). v15 compatible con v14 de Vehículos; focales/tipos/build/E2E y QA independiente PASS; backup/restore y suite Linux UNRUN. B-T11/D5/E3.2 global pendientes. Próximo: CI Linux del SHA final; sin merge/deploy. |
| DEV13-H1/CI · corrección H1 y schema13 | OpenCode, sesión funcional DEV13-H1/CI; versión e ID técnico desconocidos | ESPERANDO RETORNO — último paquete entregado por usuario; ejecución/fin no inferidos | PR71 OPEN/DRAFT, HEAD1255ef8 verificado. Schema13 en commit local7339b5e comprobado; nuevo commit local a0e0567 observado, sin retorno final ni validación de candidato. Resolución H1 de Álex preserva E1.5 y separa no-Transferencias del motor. Próximo: recibir HANDOFF completo de esa sesión, revisar diff y evidencia, publicar solo bajo gates vigentes y repetir CI/QA. Sin nueva orden externa ahora. |
| EXT-OPENCODE-QA12-CLOSE · cierre QA dev12 | OpenCode, sesión funcional QA12/PR67; versión e ID técnico desconocidos | PENDIENTE DE ENVIAR — paquete preparado; envío no confirmado en este chat | PR67 OPEN, HEADbb24934 verificado. CI40191028155 SUCCESS verificada anteriormente; informe QA anterior comunicado favorable condicionado, no informe nuevo de esta sesión. Checkpoint dev12 localc971ff4 preservado. Acción humana: confirmar si se envió el paquete existente o enviarlo una vez a sesión QA12/PR67; no afirmar ejecución. MergePR67 no aprobado. |
| EXT-OPENCODE-SPEC14 · especificación E3.2 | OpenCode, sesión funcional Spec14; versión e ID técnico desconocidos | COMPLETADO — documentos y merge verificados | Originales a5f9400/c2cf298 preservados; publicación exacta50c0d64, PR72 MERGED36fd238 por usuario.39AC aprobados. Sin correcciones ni respuesta necesaria al autor. Desarrollo14 no autorizado. |
| EXT-OPENCODE-DEV14-D5 · aportaciones desde Exterior | Coordinador OpenCode, checkout aislado `.../T/opencode/dev14-d5`, rama `codex/dev14-d5-exterior`; PR #90 Draft | QA INDEPENDIENTE APTO / CI #572 SUCCESS — PR DRAFT, SIN MERGE | Código `b2b0b89`; esquema v17. D5 focal 10 PASS/134; Base B 10 PASS/179; E2E 2/2; typecheck/build PASS. Linux Ubuntu 24.04.5: API 270 PASS/0 FAIL/3872 y d5-backup PASS. CI #572 required SUCCESS; #552 falló por billing de GitHub (no código); #564 detectó R10 v16→v17 corregido. B-T11/E3.2 fuera; sin merge/deploy/datos reales. Próximo: revisión de PR #90 y aprobación explícita de merge. |

DEV13 conserva autorización previa de desarrollo y corrección H1; no reanudación
automática por esta sincronización. AC36 PARCIAL, integración Cierres UNRUN,
aceptación global abierta. CI PR71 último resultado FAILURE183PASS/3FAIL, sin
refrescar runs en esta sincronización; corrección no publicada. QA13 anterior
recibida/contrastada con H1 y CI, dictamen no apto merge; QA independiente del
nuevo delta aún pendiente y sin asignar. No convertir pruebas de autor en QA.

Identidades funcionales se conservan aunque el ID técnico no esté disponible.
Un retorno se atribuye solo por su Task ID/sesión; pedir aclaración si ambiguo.
No agentes/chats consultados ni mensajes externos enviados por herramientas.
B3/Dev32, datos reales, Excel/VPS/deploy fuera. La sincronización no autoriza
mergePR71, desarrollo14, D5 ni otra ampliación. Próxima acción del coordinador:
validar/publicar adaptación documental; aprobación de su PR/merge separada.

---

## Estado vigente — 2026-10-25 — adopción v2.9.0

- Harness v2.8.0 integrado PR66/main `10bb794`; candidato `ee2f431`. CI [candidato40173694194](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/40173694194) y [main40174086170](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/40174086170) SUCCESS según entregable externo, no reconsultados en esta adopción; QA documental externa favorable con CI UNRUN por falta de acceso.
- Autorización vigente: actualización local Standard v2.9.0 y validaciones/QA independiente, sin merge/deploy. Rama `codex/adopt-harness-v290`, base `10bb794`, fuente `781ffbb`. [Plan/evidencia](methodology/orchestration-adoption.md#harness-v290--adopción-local). Baseline PASS (57/24/9/8/15 regresiones) y H290-QA independiente PASS del diff14rutas; selección efectiva QA `gpt-6.1-sol` + `low` verificada en metadatos. OpenCode deshabilitado en esta ejecución.
- Dev12 autorizado: usuario «Autorizo dev12 conforme a la especificación y wireframes aprobado». Checkout externo principal MyFinanzas, rama `codex/dev12-flujo-mensual`, HEAD observado `bb24934`, limpio al preflight. Candidato no revisado aquí; QA independiente pendiente, sin merge.
- Spec13/E3.1 autorizada solo especificación: usuario «Autoriza preparar la especificación E3.1, sin desarrollo». Worktree externo aislado `myfinanzas-spec13-opencode` (ruta local en paquete del usuario), base observada `10bb794`; contenido/progreso externo no verificado. No se inicia ni controla OpenCode desde esta ejecución; inicio/parada del cliente externo corresponden al usuario.
- Cuota inicial63%/79%, mínimo63%; techo subagentes `gpt-6.1-sol` + `low` con contexto nuevo. Sin autorización inferida al alcanzar umbrales25%/5%.
- Siguiente acción: revisar commit local v2.9.0; publicación/PR no realizada, full Linux UNRUN y merge sin autorización. Cuota antes de QA54%/77%, sin excepción necesaria; umbrales reales25%/5%, OpenCode y handoff entre chats UNRUN. No aplicación/SQL/Excel/deploy, cambios en plantilla fuente ni investigación B3/Dev32.

Los apartados inferiores son historia conservada; este resumen sustituye sus etiquetas vigentes.

---

## Estado vigente — 2026-10-25

- Aplicación: dev11/E2.5 integrada por PR63 en main `ed4a272`; candidato validado
  `7d24a7f`, CI40128422924 SUCCESS. [Cierre/evidencias](11-nomina-prevision-progress.md#cierre-vigente--2026-10-24).
- Spec12 completa/wireframes/56AC aprobados e integrados PR65/main `42a3efe`; dev12
  no autorizado. [Spec](12-flujo-mensual-specification.md) / [registro](12-flujo-mensual-brainstorming.md).
- Piloto operativo integrado PR64/`467c11a`; mantiene medición y límites locales.
- Trabajo vigente autorizado: adopción v2.8.0/`a451dff`, rama `codex/adopt-harness-v280`.
  [Alcance/procedencia](methodology/orchestration-adoption.md#harness-v280--adopción-local).
- Baseline y23 regresiones del validador PASS; QA independiente H280-QA PASS.
- Próximo: publicar candidato/PR y validar full CI Linux; merge exige aprobación propia.
- Sin aplicación/SQL/Excel/deploy, cambios en plantilla fuente o investigación B3/Dev32.

Los apartados inferiores son historia conservada; no recargarlos para conocer el estado actual.

---

## Dev11 — PR63 en borrador, fixture corregida tras CI — 2026-10-24

PR63/head5979731: baseline PASS, API167 PASS/1 FAIL en fixture P11 producción:
S001 demo no existe en producción. Destino ahora creado explícitamente mediante
servicio existente, sin cambiar código de aplicación ni quitar assertions. Regresión
P22 y C1 final22 PASS/156 assertions; tipos y revisión independiente del delta PASS.
[Progreso/evidencias](11-nomina-prevision-progress.md). Publicar corrección y esperar
CI Linux completa; no merge/dev12/Excel/deploy. Estados inferiores son hitos históricos.

---

## Dev11 — candidato local y QA conformes, CI Linux pendiente — 2026-10-24

[Progress11](11-nomina-prevision-progress.md) / [testplan46AC](11-nomina-prevision-testplan.md).
Un ejecutor, QA independiente PASS tras resolver carreras UI/corte y contexto ABA.
Focal21 PASS/152 assertions; tipos/build PASS. C2 final1 PASS(3,7s), impacto desde
Movimientos, async/conflictos y capturas390/1440 inspeccionadas; contraste mínimo6,04:1.
Baseline PASS. Application local NO PASS: API120PASS/43FAIL en macOS (libc/operación
Linux), global E2E UNRUN; no omitir guardas. CI Linux/restore pendientes. Rama
`codex/dev11-nomina-prevision`, base `1cf13b4`; preparar commit/PR de candidato.
Sin merge, Excel real, deploy, plantilla o investigación B3/Dev32.

---

## Dev11 — E2.5 autorizado y en curso — 2026-10-24

Fuente: usuario «Autorizo», respuesta inmediata al único gate de desarrollo dev11,
tras integración aprobada de spec11/wireframes PR62 en main `1cf13b4`.
Rama `codex/dev11-nomina-prevision`, checkout limpio de partida. Alcance: implementar
[spec11 rev3](11-nomina-prevision-specification.md), incluidos persistencia propia,
API y UI, con los 46 AC aprobados y datos exclusivamente ficticios.
Un ejecutor y QA independiente al candidato; pruebas focales por incremento y
verificación canónica del candidato, sin reinstalaciones o rondas redundantes.
Mantener separados histórico/documentación, banco y pronóstico. No reabrir Q1–Q6/M1.
Sin Excel real, despliegue, cambios de plantilla, B3/Dev32 ni merge por inferencia.
Progreso/testplan11 recogerán cobertura real y bloqueos; ningún AC fallido se difiere
como contrato futuro. La publicación/PR sigue la política Git; merge exige aprobación.

---

## Spec11 — rev3, relación N:M y wireframes aprobados — 2026-10-24

Fuente real: «Aprobadas», respuesta inmediata a solicitud única de spec11 rev3 completa,
incluida relación técnica N:M y wireframes. [Spec11](11-nomina-prevision-specification.md) /
[registro11](11-nomina-prevision-brainstorming.md). Q1–Q6/M1 cerradas;46 AC futuros.
Candidato aprobado SHA256 `c35beb2dac62ad0898b2dafd857138a91806309e235ea755670953cf6fe157f8`;
solo actualizados estado/fuente de aprobación, sin cambiar reglas/diseños. QA documental
independiente conforme, sin implementación o equivalencia numérica del Excel acreditadas.
Rama `codex/spec11-nomina-prevision`, base main `e1d6dba` verificada. Preparar PR documental;
checks y autorización de merge propios. Dev11 no autorizado; tampoco SQL/Excel/deploy.
No reanudar B3/Dev32 ni cambiar plantilla. Los hitos inferiores conservan historia.

---

## Spec11 — Neto documentado aceptado, propuesta completa rev3 — 2026-10-24

Fuente: usuario «E2.5 — Decisión sobre Neto documentado y conciliación».
[Brainstorming11](11-nomina-prevision-brainstorming.md) registra M1 resuelto;
[spec11 rev3](11-nomina-prevision-specification.md) incorpora captura opcional con
evidencia, Histórico independiente y conciliación con referencia válida/discrepancias.
Comprobación de reutilización actual:sin campo Nómina/Neto documentado semánticamente
idéntico instalado; antes de implementar revalidar fuentes, sin cambiar esquema ahora.
Q1–Q6/M1 sin preguntas pendientes.46 AC futuros; diseño técnico N:M, protocolos y
wireframes rev3 pendientes de aprobación completa. Sin desarrollo/SQL/Excel/merge.
Revisión independiente SPEC11-DOC-QA PASS del delta, sin nuevos conflictos materiales.
Candidato rev3 SHA256 `c35beb2dac62ad0898b2dafd857138a91806309e235ea755670953cf6fe157f8`.
Estructura/enlaces/whitespace PASS;46 IDs AC únicos y bloques de wireframes equilibrados.
No tests funcionales, instalaciones o CI. Próximo paso:aprobación completa rev3,
incluida relación técnica N:M y wireframes; no desarrollo/SQL/Excel/merge por inferencia.

---

## Spec11 — resolución Q4–Q6 integrada en rev2 — 2026-10-24

Fuente: usuario «E2.5 Nómina — Resolución de decisiones adicionales Q4–Q6».
[Brainstorming11](11-nomina-prevision-brainstorming.md) conserva rondas y respuestas;
[spec11 rev2](11-nomina-prevision-specification.md) separa físico/limitaciones/app.
N:M conceptual aceptada; diseño técnico por IDs/importes y diferencia con C176 explícitos.
Fórmulas salariales/prudente y validaciones propuestas recibidas, sin inventar nuevo
motor fiscal.40 AC futuros y wireframes rev2. M1 fuente/captura de Neto documentado
sin histórico y desempate de formato monetario expuestos antes de cierre completo.
Sin aprobación completa/visual/estructural, desarrollo, SQL, Excel o merge.
QA independiente SPEC11-DOC-QA PASS con límites, sin nuevos conflictos materiales.
Formato final explicitado como propuesta técnica, sin afirmar equivalencia numérica.
M1 es el único cierre material pendiente: aceptar fuente/captura opcional del neto
documentado o mantener no disponible si falta original. Sin nueva confirmación Q1–Q6.
Estructura/enlaces y whitespace PASS; no suites funcionales ni instalaciones.
Próximo hito: resolver M1 y presentar especificación/wireframes completos para aprobación.

---

## Spec11 — Q1–Q3 confirmadas y propuesta rev1 — 2026-10-24

Fuente real: usuario «E2.5 — Nómina: decisiones funcionales Q1–Q3», contraste de Álex
atribuido a hoja Nómina/tablas/Criterios v5.11(7), sin inspección propia.
[Brainstorming11](11-nomina-prevision-brainstorming.md) conserva ronda1 y respuestas;
[spec11 rev1](11-nomina-prevision-specification.md) desarrolla vínculo mínimo propuesto,
casos parciales/múltiples/fuera de mes, fórmulas de previsión y wireframes provisionales.
Q4 cardinalidad/abonos agrupados, Q5 derivados/referencias y Q6 prudente/precisión
pendientes. Q1–Q3 no se reabren. No modelo estructural aprobado, SQL, desarrollo,
Excel, merge ni nuevo motor fiscal. Un ejecutor, controles documentales proporcionales;
próximo paso: resolver solo esos complementos antes de cerrar vínculos/cálculos.

---

## Spec11 — E2.5 iniciada, ronda1 pendiente — 2026-10-24

Usuario: «Inicia» / «Venga empieza», en contexto único de spec11. Main verificado
`e1d6dba`, dev10 integrado por PR61 tras «Apruebo merge»; checkout limpio de partida.
[Brainstorming11](11-nomina-prevision-brainstorming.md), rama codex/spec11-nomina-prevision.
Contratos R3 y roadmap conservados; Q1 unidad/campos históricos, Q2 atribución de
cobros y Q3 entradas/fórmulas de previsión pendientes. Sin reglas fiscales inventadas.
Sin aprobación de especificación/wireframes, desarrollo, SQL, Excel o merge.
Un ejecutor, sin delegación ni suites funcionales para abrir esta ronda. Próximo paso:
recibir respuestas funcionales y preparar diseño documental, sin reabrir Ciclos/R3.
Los estados dev10 inferiores son hitos históricos: CI de PR61 pasó147 API/4E2E;
B3 pasó esa ejecución, incidencia intermitente no cerrada. No se reanuda investigación.

---

## Dev10 — autorizado y en curso — 2026-10-24

Fuente real: usuario «Autorizo», respuesta inmediata al único siguiente alcance
pendiente, desarrollo de dev10 tras integrar spec10/PR60. Base main `72833b9`.
[Spec10 rev2](10-plan-anual-specification.md) y wireframes aprobados; Q1–Q6 cerradas.
Rama `codex/dev10-plan-anual`; un ejecutor, QA independiente al candidato.
Ownership código/tests/progress10/testplan10/arquitectura del ejecutor; tablero del
coordinador. Prerrequisitos: Python3.12/Bun1.4.3/age/navegador ya disponibles; no repetir
instalaciones sin necesidad. MacOS no acredita las guardas Linux; full en CI Linux.
Sin merge, Excel real, despliegue, reanudación B3/Dev32 ni cambio de plantilla.
Próximo hito: incrementos verificables, matriz34 AC actuales frente a contratos futuros
expresos (histórico/cierres/consumidores no instalados), sin reclasificar fallos actuales.

Hito I1 del ejecutor: esquema11/API anual/motor/UI conectados, typecheck PASS.
Focales, continuidad y E2E/visual aún en curso; no candidato final ni PASS global.
Revisión temprana del coordinador detecta parseo con límite individual int64 aplicado
al agregado ejecutado (corrección solicitada) y revisa el corte temporal adicional
por reloj. Sin cambios concurrentes al código ni reinterpretar decisiones financieras.

Hito candidato1: ocho focales83 aserciones, tipos/build PASS por ejecutor. QA10
independiente encuentra preview sin derivados/importes y ciclos sobraincluidos; P2
pendiente de corrección, con probe SQLite propio. E2E coordinador ejecutado:1 FAIL6,2s
porque tras MFA el recorrido no navega desde Saldos a Plan anual; corrección de fixture,
no cambio de autenticación. Capturas y aceptación aún pendientes. Un intento de browser
del ejecutor quedó en permiso sin ejecutarse (~8min); se interrumpió y root asume el gate.
No declarar que esa espera es tiempo de tests ni duplicar una suite no iniciada.

Hito local final:9 focales91asserts y tipos/build PASS del autor; P2 QA cerrado con
probe independiente7asserts, sin nuevos hallazgos. B final1PASS2,1s/3,4s ejecución,
tras4FAIL de fixture (navegación/selectores). Capturas390/1440 inspeccionadas; corregida
superposición de columnas heredadas; contraste efectivo mínimo5,81:1. Se añade solo
allowlist PNG e2-4 en CI para evidencia funcional, sin cambiar gates/plantilla.
Baseline único PASS; pendiente full Linux con P11restorev11 al publicar. Evidencia
remota por SHA/run en checks/resumen de la PR, sin commit de auto-registro que repita
full innecesariamente. No aceptación global/merge antes del gate.

---

## Spec10 — rev2 y wireframes aprobados — 2026-10-24

Fuente real: «Aprobadas», respuesta inmediata a la solicitud única «¿Apruebas la
especificación completa rev2 y sus wireframes?». Q1–Q6 confirmadas;34 AC futuros.
[Spec10](10-plan-anual-specification.md) y [registro](10-plan-anual-brainstorming.md).
QA documental independiente PASS sobre candidato SHA256
`d38a51e2c2e563e02819aed8cd4d49c132ec494c0f5397e5966b8abd853a1b95`;
actualización administrativa de estados, sin cambio de reglas/diseños aprobados.
Rama `codex/spec10-plan-anual`, base main `5c3e49b`. Preparación de PR documental;
no desarrollo autorizado, SQL, migración, Excel, merge, B3 ni Dev32.
Próximo gate: revisión/CI documental y aprobación específica de merge de la nueva PR.
Tras integrar, dev10 seguirá requiriendo autorización propia. Piloto solo local;
ningún cambio a la plantilla ni afirmación de ahorro causal.

Piloto — balance de preparación/revisión hasta solicitar aprobación: tres turnos
cerrados (01a16e55,01a16e5f,01a16e68; IDs completos en hitos inferiores), sin duplicar
respuestas: coordinador21 respuestas/entrada5239991/caché incluida5209344/salida24347;
QA independiente3 respuestas/entrada117275/caché incluida102528/salida322.
Fuente collect existente; excluye registro/publicación de esta aprobación y trabajo futuro.
Un ejecutor y un paquete QA acotado; cero hallazgos bloqueantes documentales; sin
instalaciones, suites funcionales locales ni cambios de plantilla. Controles documentales
por revisión; baseline final de publicación PASS una vez, sin cambios de aplicación.
Bloqueo operativo inicial de rama204,386s ya registrado, sin atribuirlo todo a humano.
Q1–Q6 no se reabren tras confirmarse. Mantener piloto en fase documental; muestra sin
comparación homogénea para probar ahorro causal ni reducción de defectos funcionales.
Dev10 no autorizado: evaluación funcional pendiente, no extrapolar estos datos.

---

## Spec10 — Q1–Q6 confirmadas, revisión completa rev2 — 2026-10-24

Fuente: usuario «Spec10 — Resolución Q4–Q6 por Álex»; registro append-only en
[brainstorming10](10-plan-anual-brainstorming.md). [Spec10 rev2](10-plan-anual-specification.md)
incorpora Diferencia redondeada, fecha histórica/Gastos, agregado esencial incompleto,
protección de ciclos/fotografías e inactivos. Wireframes rev2 y34 AC futuros.
Sin preguntas Q1–Q6 abiertas. Documento completo y wireframes NO aprobados todavía.
Sin desarrollo, SQL, migración, Excel, merge ni reanudación B3. Próximo paso: QA
completa por el usuario. Fuentes físicas atribuidas al contraste de Álex, no inspección
propia. Se preservan los hitos inferiores.

QA independiente SPEC10-DOC-QA: PASS documental, sin hallazgos bloqueantes; lectura de
specification completa y respuestas confirmadas, sin pruebas funcionales ni escrituras.
Candidato rev2 SHA256: `d38a51e2c2e563e02819aed8cd4d49c132ec494c0f5397e5966b8abd853a1b95`.
Control estructural/enlaces y whitespace PASS, una ejecución; sin suites de aplicación,
instalaciones, escalaciones ni CI. No acreditar implementación ni aceptación visual.
Piloto, corte parcial UTC 2026-10-24T15:00:02+00:00, turno `01a16e68-48df-73f2-b1ef-2be6690a0b74`:

- /root (gpt-6.1-sol): 5 respuestas, entrada 1328571, caché incluida 1320832, salida 8982.
- /root/qa_spec10_doc (gpt-6.1-sol): 3 respuestas, entrada 117275, caché incluida 102528, salida 322.

Corte de registros existentes, excluye respuestas posteriores; QA detectados0 en esta revisión documental, no evidencia de ausencia de defectos funcionales. Sin atribuir ahorro causal.

---

## Spec10 — Q1–Q3 confirmadas, propuesta rev1 — 2026-10-24

Fuente: mensaje del usuario «Spec10 — Decisiones funcionales de Álex para E2.4 Plan anual».
[Brainstorming10](10-plan-anual-brainstorming.md) conserva ronda1 y añade respuestas;
[spec10 rev1](10-plan-anual-specification.md) propone contratos, wireframes y24 AC futuros.
Presupuesto anual manual único; Periodo previsto texto; Esencial Sí/No/Pendiente y
suma anual/12 confirmados. R3/R6 revisadas: equivalente anual no es coste global,
no doble cómputo ni sobrescritura del Esencial manual del ciclo. Evidencia Excel atribuida.
Pendientes nuevos Q4 derivados, Q5 agregado incompleto y Q6 edición pasada/inactivos.
Sin aprobación completa/visual, desarrollo, SQL, Excel, merge ni reanudación B3.
Piloto, corte parcial24/10 16:50:04 Madrid, turno `01a16e5f-8966-7221-861a-7a4ef838ca56`:
coordinador gpt-6.1-sol,4 respuestas,entrada987075,caché incluida979840,salida8499.
Fuente collect existente; excluye respuestas posteriores. Sin subagentes, instalaciones,
CI ni nuevas escalaciones. Un validate-template PASS y whitespace PASS; cero repeticiones.
QA independiente/hallazgos N/D hasta candidato completo. Sin comparación causal de ahorro.
Un ejecutor; siguiente paso: revisión Q4–Q6 antes de aprobación completa.

---

## Spec10 — ronda1 documental abierta — 2026-10-24

Usuario: «Sigue con spec10». Main `5c3e49b`, piloto PR59 integrado tras «Apruebo merge»;
los apartados inferiores conservan historia. Rama `codex/spec10-plan-anual`.
[Brainstorming10](10-plan-anual-brainstorming.md): E2.4, Plan anual por Partida/ejercicio.
Q1 importes/edición, Q2 dominio de Periodo previsto y Q3 regla de esenciales pendientes.
No se reabren las decisiones R3 ya documentadas. Sin specification, wireframes aprobados,
desarrollo ni migración. Un ejecutor, sin delegación para esta ronda.
Piloto, corte parcial 24/10 16:39:27 Madrid, turno `01a16e55-03e5-7952-b0a3-9620957cd2ea`:
coordinador gpt-6.1-sol,6 respuestas,entrada1391340,caché incluida1378176,salida3925.
Fuente collect existente; no incluye respuestas posteriores. Cero delegaciones,
instalaciones o CI; un validate-template PASS y whitespace PASS, cero repeticiones.
QA independiente aún no aplica al borrador; defectos QA N/D, no cero acreditado.
Un intervalo operativo al crear rama:204,386 s envolventes, no CPU ni aprobación pura.
Sin afirmar mejora frente a otra tarea. Fuentes consultadas y Q1–Q3 quedan recuperables.
Próximo paso: recibir Q1–Q3 y continuar el diseño documental; no hacer merge ni dev.

---

## Estado vigente — piloto spec10 — 2026-10-24

Solicitud real del usuario: aplicar en MyFinanzas el piloto de eficiencia y medirlo
antes de cambiar la plantilla; no autoriza desarrollar spec10 sin sus aprobaciones.
Main comprobado: `9fd2317` (PR58 harness v2.7.0 integrada tras «Haz el merge»).
E2.3 integrada por PR57/`7422d23`; sus bloqueos inferiores son historia, no estado vigente.
B3 continúa abierto y no se reanuda por este piloto; Dev32 y Excel/despliegue fuera.

Piloto local: [reglas](methodology/myfinanzas-coordination.md#piloto-de-eficiencia--spec10--e24).
Spec10 corresponde a E2.4, Plan anual por Partida y ejercicio. Preparación documental
solicitada; spec/wireframes aún no aprobados y desarrollo NO autorizado.
Esta rama solo registra el piloto; no crea todavía specification ni código de E2.4.

| Mecanismo | Reutilización / ajuste mínimo |
| --- | --- |
| Entorno | Reusar checkout limpio; preflight por fase, sin reinstalación rutinaria |
| Delegación | Paquete existente; un ejecutor y QA independiente, contexto breve |
| Verificación | scripts/verify existente; focales por delta y evidencia por candidato |
| CI | Grafo/política intactos; consultas espaciadas y trabajo independiente autorizado |
| Medición | JSONL/reportes existentes; anotación por hito aquí y en progress/testplan10 cuando existan |

Referencia de auditoría 24/10, 08:00–12:30 Madrid: 487 respuestas propias únicas,
105325937 tokens de entrada (103818240 caché incluida), 170099 salida; coordinador
78,45% de entrada. 50 llamadas del coordinador con escalación acumularon 72,1 min
envolventes, no atribuibles íntegramente a aprobación humana. CI:24 runs,9 cancelados,
37 min28 s agregados de jobs activos; instalación Chromium78 s. No hay informes de
hooks de MyFinanzas disponibles. Estos datos no son objetivos ni una medición del piloto.

Registro inicial del piloto: preflight PASS para esta fase documental, mismo checkout,
Python3.12.14 y Bun1.4.3 disponibles; Python del sistema3.9 no se utiliza para verify.
Sin instalación, cambio de hooks/trust ni herramientas nuevas. Rama de preparación
`codex/pilot-spec10-efficiency`; baseline canónico PASS una vez y QA documental
independiente PILOT10-QA PASS, cero hallazgos bloqueantes (sin repetir tests).
Mediciones se cortarán por sesión/turno/candidato, sin mezclar el consumo de la auditoría
con el piloto. No se declara todavía ahorro ni resultado funcional de spec10.
Corte fijo de preparación, 24/10 16:18:10 Madrid (14:18:10 UTC), turno raíz
`01a16e41-5872-73c2-b1ca-9ff7ef6be56f`, modelo gpt-6.1-sol:

| Agente | Respuestas | Entrada | Caché incluida | Salida |
| --- | --- | --- | --- | --- |
| Coordinador | 10 | 2090422 | 2077056 | 4829 |
| QA documental, contexto nuevo acotado | 4 | 143267 | 103424 | 396 |

Fuente: collect de scripts/report-agent-usage, sin generar archivos ni activar hooks.
Corte parcial: no incluye respuestas posteriores, publicación ni el futuro trabajo
funcional de spec10. Un baseline ejecutado; cero repeticiones y cero fallos de tests
hasta este corte. QA: cero defectos detectados; no equivale a QA de E2.4.
Un intervalo operativo de escalación al crear rama: 16:13:10–16:15:49 Madrid,
159,09 s envolventes (no tiempo de CPU ni aprobación humana pura). No hubo colisión
de archivos, reinstalación ni bloqueo de desarrollo resuelto por inferencia.

Próximo hito: revisar/publicar este registro y continuar spec10 con las decisiones
funcionales pendientes según Skill spec; merge de cada PR requiere aprobación propia.

---

## Dev09 autorizado y en curso — 2026-10-24

Fuente: mensaje real del usuario «Autorizo dev 09». Spec09 revisión4 y wireframes
aprobados e integrados mediante PR #54, main `568aeed`. E2.1/dev07 ya integrada
PR #49; E2.2/dev08 integrada PR #44. Sus estados pendientes inferiores son históricos.
CI docs de #54 verificada: baseline/required SUCCESS, full omitido correctamente.
Correcciones #55 (clasificación documental) y #56 (foco de revisión) integradas.

Dev09: rama `codex/dev09-plan-ciclo`, un ejecutor, QA independiente al candidato.
Ownership producto/tests/progress09/testplan09 del ejecutor; tablero del coordinador.
Entregable: E2.3 según [spec09](09-plan-ciclo-specification.md), 36 AC actuales y
V1–V10; evidencia en [progress09](09-plan-ciclo-progress.md) y
[testplan09](09-plan-ciclo-testplan.md). Candidato publicado en PR #57, HEAD `88941e1`.
CI40076614284: API137PASS/1FAIL (B3 heredado IOERR_SHORT_READ522);13 pruebas nuevas
PASS y E2E local1PASS, pero E2E global pendiente. Aceptación global bloqueada,
sin investigación B3 ni reintentos automáticos. Checkpoint documental local separado.
Sin merge autorizado de PR funcional, datos reales, Excel, despliegue, reanudación
Dev32 ni investigación B3. Cierres/fotos y fuentes E3/E4 continúan futuros.

## Dev07 verificado, PR #49 pendiente de revisión — 2026-10-23

Fuente de autorización: mensaje real del usuario «Autorizo reanudar Dev07 / E2.1 —
Operación de Ciclos, utilizando `$orchestrate` y la metodología vigente». Sustituye
STOP únicamente para este alcance; no autoriza merge ni otras líneas.
Este estado prevalece sobre los registros históricos inferiores.

## Verificación actual — 2026-10-23

Candidato funcional `a2722f4`, PR #49 pendiente de revisión/merge; main `8fae7a44`
incorporado preservando el checkpoint `d1868dc`. SQLite31-E1 intacto; E2.2 v8 y E2.1 v9.
CI Linux [39974920637](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/39974920637)
SUCCESS: API 125/0 (2228 aserciones), E2E 2 PASS, tipos/build/controles PASS.
AC23 verificado por cinco pasadas locales + cinco Linux, O4/O5/O7 v7/v8 y suite global;
QA independiente9/167 y probe de antiguo schema8, sin bloqueos; capturas390/1440 inspeccionadas.
Evidencia completa y límites en [testplan07](07-ciclos-operacion-testplan.md).
Los bloques inferiores conservan historia previa; AC27–29/E2.1-AC2 siguen futuros.
Sin Dev32/infraAC22/B4/E2.3, datos reales, deploy o merge. Próximo paso: revisión PR #49
y aprobación expresa por su número. El cierre posterior solo cambia documentación.


---

## Estado vigente — E2.2 integrada — 2026-10-23

Coordinador (Claude Code, `/orchestrate`). Prevalece sobre los apartados inferiores; el
tablero registra, no concede, autorizaciones. Main verificado `255bf61` con CI SUCCESS; después `a7fb9d8` (PR #29).

| Línea | Estado verificado | Próxima acción / gate |
| --- | --- | --- |
| E2.2 / dev08 | INTEGRADA: PR #44 squash `255bf61` tras «Apruebo PR #44» del usuario, HEAD `6eeb727` con ambas CI SUCCESS (job pull_request relanzado una vez a petición del usuario por fallo intermitente de SQLite B4) | Cerrada; limitaciones en [testplan08](08-presupuestos-testplan.md) |
| E2.3 | Siguiente entrega del roadmap; consume Presupuestos | Requiere especificación y autorización propias |
| E2.1 / dev07 / AC23 | BLOQUEADO; rama `feat/07-ciclos-operacion` fuera de main, sin PR. Investigación 2026-10-23: la sonda `immutable=1` de `persistentIdentity` produce `SQLITE_CORRUPT/11` en migraciones concurrentes (21/150 rondas; control con bloqueos 0/150); atribución al fallo de dev07 pendiente ([diagnóstico](investigations/ac23-immutable-probe.md)) | Corrección de la sonda requiere autorización expresa; después, reanudar dev07 renumerando su esquema a v9 |
| Spec31 / enmienda 31-E1 | APROBADA 2026-10-23 («Apruebo enmienda 31-E1»); desarrollo autorizado el 2026-10-23 e implementado en `fix/ac23-persistent-identity` (código `07e0369`, CI 114/0, QA sin bloqueos), pendiente de merge: verificar identidad con conexión convencional y transacción de lectura; garantía lógica en lugar de bytes de WAL/SHM ([propuesta](31-sqlite-produccion-enmienda-01.md)) | Merge de su PR con «Apruebo PR #N»; después, decidir si se reanuda dev07 (renumerando su esquema a v9) |
| SQLite B4 | Fallo intermitente observado una vez en CI de `6eeb727`; pasó al relanzar | Incidencia de apertura SQLite fuera de alcance; no investigar sin autorización |
| Spec32 / PR #29 | INTEGRADA: squash `a7fb9d8` tras «Apruebo PR #29» del usuario, HEAD `a9e0fdb` con CI SUCCESS y merge con main verificado localmente | Solo documentación; no reactiva Dev32 |
| Dev32 / PR #30 / AC22 | PAUSED; draft con conflictos, 12 commits por detrás de main | Reanudar solo con autorización expresa; revisar actualización/rollback con esquema v8 |
| PRs #21 y #22 | CERRADAS 2026-10-23 como sustituidas por spec31/dev31 (#23, #25, #28, #31), con permiso del usuario; ramas conservadas | — |
| PR #35 | Cerrada como sustituida por #43 | — |

Worktrees temporales de dev08/QA08 eliminados tras el merge; rama `feat/08-presupuestos` conservada.

---

## Estado vigente — dev08 candidato verificado — 2026-10-23

Coordinador (Claude Code). Prevalece sobre «Parada y checkpoint WIP dev08» inferior; el
tablero registra, no concede, autorizaciones. Main verificado `ca5de20` (PR #43, harness
v2.5.0). PR #35 cerrada como sustituida por #43 con permiso del usuario.

| Línea | Estado verificado | Próxima acción / gate |
| --- | --- | --- |
| E2.2 / dev08 | Autorizado por «Álex — Autorización de desarrollo E2.2 · `$dev 08`» (texto en el apartado 2026-10-22 inferior). Candidato en `feat/08-presupuestos`, CI Linux por SHA en [testplan08](08-presupuestos-testplan.md) | PR funcional; merge solo con «Apruebo PR #N» |
| Decisión dev08 | Usuario 2026-10-23: «Sí: cambiar la fuente con un destino ya inactivo cuenta como nueva relación y debe exigir un Saldo activo; solo renombrar conserva el destino inactivo.» Implementada en `2880f98` | Sin otras decisiones abiertas |
| QA08 | Independiente: QA08-1 `f82064b` NO_BLOCKERS (24 AC PASS), QA08-2 delta `84078b2` NO_BLOCKERS, QA08-3 delta `2880f98` NO_BLOCKERS | Limitaciones menores listadas en testplan08 |
| E2.1 / AC23 | BLOQUEADO; dev07 fuera de main sin PR | Integrar dev07 exigirá reconciliar su esquema8 con el contrato v8 de E2.2 |
| Dev32 / PR30 y PRs #21, #22, #29 | PAUSED / abiertas sin decisión | No reanudar |
| E2.3, F-01/F-02 | Fuera de alcance | Sin Base/Esencial/Del mes ni ejecución |

---

## Reconciliación — 2026-10-23 — main 30c7ea0

Coordinador: reconciliación documental solicitada por el usuario; no concede autorizaciones nuevas.
Main remoto verificado en `30c7ea0` (PR #41, adopción orquestación v2.4.2, solo metodología),
sobre `20d8f9a` (PR #39, spec08). Este apartado complementa el cierre spec08 inferior
(PR #40, integrada por squash en main `11e2fae` el 2026-10-23 tras «Apruebo PR #40» del usuario, HEAD `b5c88d7` con CI SUCCESS) y prevalece
sobre estados históricos más antiguos.

| Línea | Estado verificado en Git | Próxima acción / gate |
| --- | --- | --- |
| E1.1–E1.6 | Integradas; E1.6 por PR34 `cb9ba3b` | Sin cambios |
| E2.1 / spec07 | Aprobada e integrada PR37 `c04dc07` | Sin cambios de decisiones ni criterios |
| E2.1 / dev07 | Rama `feat/07-ciclos-operacion` HEAD `d1868dc`, fuera de main; sin PR (ningún `refs/pull/*/head` apunta a ella). Handoff STOP / NO AUTO-RESUME en progress07 de esa rama | Reanudar solo con nueva instrucción expresa del usuario |
| AC23 | BLOQUEADO; API 105 PASS / 1 FAIL errno11 según checkpoint dev07 | Sin investigación nueva sin hipótesis discriminante y autorización |
| E2.2 / spec08 | Aprobada e integrada PR39 `20d8f9a`; cabecera de la especificación actualizada a APPROVED por instrucción del usuario del 2026-10-23, que sustituye la decisión de PR #40 de no tocarla; cuerpo intacto | Spec aprobada no autoriza dev08 |
| E2.2 / dev08 | NO AUTORIZADO; plan propuesto en el cierre spec08 inferior | Esperar autorización expresa de desarrollo |
| Dev32 / PR30 / AC22 | PAUSED; PR30 HEAD `a090112` | No reanudar |

Paquetes activos: ninguno. Worktrees adicionales en este checkout: ninguno. Los SHAs
históricos de cabecera del tablero (`cb9ba3b`) quedan sustituidos por este apartado.

PRs verificadas con `gh` el 2026-10-23 (este registro no aprueba merges):

| PR | Rama | Estado | Nota |
| --- | --- | --- | --- |
| #40 | `docs/08-integration-close` | MERGED squash `11e2fae` (HEAD `b5c88d7`, CI SUCCESS) | Cierre spec08 y plan dev08; aprobada expresamente por el usuario |
| #35 | `docs/explicit-approvals-v2-3-2` | Abierta, CONFLICTING | Metodología v2.3.2; posiblemente superada por v2.4.x, sin decidir |
| #30 | `feat/32-ejecucion-rootless` | Draft, CONFLICTING | Dev32 PAUSED |
| #29 | `spec/32-ejecucion-rootless` | Abierta, MERGEABLE | Spec32 aprobada, no integrada |
| #22 | `infra/production-sqlite-bootstrap` | Draft, CONFLICTING | Infra pausada |
| #21 | `infra/production-bootstrap-spec` | Draft, MERGEABLE | Infra pausada |

Cerrar o actualizar PRs antiguas requiere decisión expresa del usuario por PR.

---

## Estado vigente — cierre spec08 y autorización de integración — 2026-10-22

Fuente: aprobación documental final de Álex y autorización expresa de squash PR39. Este apartado prevalece sobre estados históricos inferiores; el tablero registra autorizaciones, no las concede.

| Línea | Estado verificado | Próxima acción / gate |
| --- | --- | --- |
| E2.2 / spec08 | APROBADA e integrada por squash PR39, main20d8f9a6eef9888e03a5a61ecb11a13b21fbc2ad | Spec y wireframes cerrados; preservar decisiones,24 AC actuales y F-01/F-02 futuros |
| E2.2 / dev08 | NO AUTORIZADO; implementación y pruebas de E2.2 no ejecutadas | Presentar plan y esperar autorización independiente; spec aprobada no autoriza dev |
| E2.1 / spec07 | Especificación aprobada e integrada PR37/c04dc07 | Sin cambio de decisiones ni criterios |
| E2.1 / dev07 / AC23 | Implementación conservada fuera de main; AC23 BLOQUEADO, sin aceptación global | No presentar API105 PASS/1 FAIL como resuelta por verdes posteriores |
| AC23-SQLITE | Incidencia técnica separada; investigación actual CERRADA INCONCLUSA | Sin nuevos probes/instrumentación/cambios sin hipótesis nueva discriminante y autorización aplicable |
| Dev32 / PR30 / AC22 y otras tareas pausadas | PAUSED | No reanudar |
| E2.3 | Fuera de esta autorización | No implementar planificación/ejecutado/pendientes/estados mensuales en E2.2 |

PR39 se integró únicamente después de verificar HEAD0f3d4e5575cd855558cfd8a8cfb11e980ff55398, mergeable sin conflictos y CI push39851581005/PR39851590534 completed SUCCESS sobre ese SHA. Diff final: solo brainstorming08 y specification08. Su corrección técnica fue una línea portable; contratos financieros y wireframes intactos. CI posterior main: [CI main39853674496](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/39853674496) completed SUCCESS sobre main20d8f9a6eef9888e03a5a61ecb11a13b21fbc2ad, confirmado después de finalizar el workflow; sin reintentos manuales.

Documentos canónicos: [brainstorming08](08-presupuestos-brainstorming.md) y [specification08](08-presupuestos-specification.md). Sus marcas DRAFT/PENDING describen la revisión previa; la aprobación completa e integración posterior quedan registradas aquí con la instrucción expresa del usuario, sin modificar los documentos aprobados ni repetir preguntas financieras. La CI acredita regresión del núcleo integrado, no implementación E2.2 ni resolución de AC23.

### Plan dev08 propuesto — pendiente, NO iniciar

1. Reconciliar base main integrada y evolución versionada del esquema; trabajar en rama aislada. No importar dev07/schema8 ni reparar apertura SQLite. Prever que cualquier integración futura de Ciclos deberá reconciliar versiones/contratos de migración y repetir su continuidad; no asumir intercambiables dos cambios de esquema pendientes.
2. Maestro/validaciones: identidad PRE estable, tres fuentes y matriz destino, unicidad global de nombres (incluidos inactivos) con criterio SUB autorizado y unicidad atómica del destino entre Aportaciones; revisión/idempotencia/auditoría y activar/desactivar preservando historia.
3. Vínculo Partida0..1 Presupuesto, Deuda independiente, protección de Partidas activas; preview/motivo/confirmación de cambios utilizados solo con impacto histórico completo verificable. Sin consumidor disponible, bloqueo explícito; no inventar cálculos E2.3.
4. API/UI conforme wireframes: listado/ficha/formulario y selector desde Partida, MFA/Origin/CSRF y estados de error/borrador/conflicto. Sin Base/Esencial/Del mes, ejecución ni importes ficticios.
5. Verificación autorizada futura: matriz24 AC, continuidad/rollback/concurrencia/backup-restore privado, regresión API y E2E390/1440; typecheck/build y revisión independiente del candidato. F-01/F-02 siguen futuros. Un FAIL global conserva el gate de entrega, sin ampliar investigación SQLite por inferencia.
6. Solo con candidato verificable: revisión de historial/contenido, commits/PR de desarrollo según autorización aplicable. Merge requerirá permiso expreso de esa PR. Sin despliegue/Excel real/datos personales ni reanudación Dev32.

Mantener un ejecutor por defecto; no crear subagentes por este plan. La revisión independiente futura no se considera ejecutada ni autorizada como actividad presente. Detenerse después de presentar este plan al usuario.

---

## Historial anterior — conservar trazabilidad

# MyFinanzas — tablero de coordinación

## Parada y checkpoint WIP dev08 — 2026-10-23

El usuario detiene desarrollo y autoriza únicamente commit/push de todo el estado
de dev08, sin PR ni merge. Este estado prevalece sobre IN PROGRESS inferior:
**dev08 WIP SIN VALIDAR**, ejecución detenida tras límite de uso de Developer.
API posterior105 PASS/0 FAIL/1713 observada en log; primera98/7 conservada;
E2E no superado y QA independiente NO ejecutada. Ver [checkpoint08](08-presupuestos-progress.md)
y [evidencia parcial08](08-presupuestos-testplan.md). No reanudar automáticamente.
AC23/E2.1 BLOQUEADO, AC23-SQLITE inconcluso separado y Dev32 PAUSED; PR40 independiente.

## Estado vigente — ejecución dev08 autorizada — 2026-10-22

Fuente: mensaje expreso «Álex — Autorización de desarrollo E2.2 · $dev 08».
Prevalece sobre permisos históricos inferiores. El tablero registra autorizaciones,
no las concede. Spec08/wireframes aprobados e integrados mediante squash PR39 en
main `20d8f9a6eef9888e03a5a61ecb11a13b21fbc2ad`; HEAD autorizado `0f3d4e5`,
CI push39851581005 y PR39851590534 SUCCESS. CI posterior main39853674496 SUCCESS.

| Línea | Estado real / autorización | Siguiente gate |
| --- | --- | --- |
| E2.2 spec08 | APROBADA e integrada PR39;24 AC actuales y F-01/F-02 futuros | Conservar decisiones/wireframes; no reabrir preguntas |
| E2.2 dev08 | IN PROGRESS; seis incrementos, pruebas, QA independiente y preparación PR autorizados | Developer entrega candidato SHA; QA evalúa, coordinador publica solo si verificable |
| QA08 | Matriz24 preparada, NO ejecución ni PASS todavía | Esperar candidato exacto, revisión independiente y checks reales |
| E2.1/AC23 | BLOQUEADO; sin aceptación global | Conservar fallo histórico; no darlo por resuelto por verdes de dev08 |
| AC23-SQLITE | Investigación actual cerrada INCONCLUSA, incidencia técnica separada | Sin probes/cambios nuevos sin hipótesis discriminante y autorización aplicable |
| Dev32/PR30/AC22 y otras tareas pausadas | PAUSED | No reanudar |
| PR40 | Actualización documental independiente, OPEN sin merge autorizado | No integrar por inferencia de permisos dev08 |
| E2.3 y F-01/F-02 | PENDING/FUERA DE ALCANCE dev08 | Sin planificación/Base/Esencial/Del mes/ejecutado/pendientes/estados mensuales |

Base exacta main verificada con árboles/commits Git, rama aislada feat/08-presupuestos.
Sin importar dev07 ni modificar checkpoints ajenos. Su migración aún fuera de main
no se presume compatible: documentar reconciliación futura y regresiones, no reparar
SQLite incidentalmente. Sin Excel real/datos personales/despliegue/migración operativa.
No merge automático de futura PR funcional. Estados históricos inferiores conservados.

---

## Historial anterior

Coordinador: único escritor; [gates locales](methodology/myfinanzas-coordination.md).
Reconciliación: 2026-10-22 Europe/Madrid. Main remoto verificado en
`c04dc07a2205f7718747bb390e15b42c09502bec` (PR #37 integrada).
PR #34 integrada en `cb9ba3b93dc12a4107f063930bca0b48b67babbe`.
PR #33 integrada en `7c5c7d1bfb62bdc77af1fad080312e6dce1577dd`.
PR #32 integrada en `da543f3af6bde89259aeb0d9b2c1faad67311c05`.
Este tablero registra estado; no concede aprobaciones.

## Autorización vigente de esta ejecución

El usuario aprobó el plan y autorizó expresamente dev06, pruebas, relevo QA independiente
y preparación de PR; especificación E2.1 sin implementación ni aprobación automática;
subagentes y worktrees seguros, máximo dos trabajadores simultáneos más coordinador.
Dev32/PR30/AC22 permanecen pausados. Sin merges, despliegues, migraciones operativas,
cambios de seguridad ni decisiones financieras nuevas por inferencia.
La instrucción posterior de continuar preserva estos permisos e incorpora PR33,
sin reiniciar agentes ni trabajo ya realizado.

| Item | Prioridad | Spec / autorización | Dev | QA | Dependencias duras | Dueño / aislamiento | Bloqueo | Siguiente acción autorizada | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ADOPT-ORCH | Cerrada | PR32 integrada; PR33 actualiza autonomía operativa | Metodología vigente | Ensayo nativo previo conservado; no repetido | Satisfechas | Coordinador | Ninguno | Aplicar contrato vigente | PR32 da543f3; PR33 7c5c7d1b |
| E1.6 | Cerrada actual | Spec06 y merge PR34 aprobados por usuario | Integrada main cb9ba3b | QA independiente y CI de rama SUCCESS | Dependencias satisfechas | Sin trabajador activo; rama feat/06-deuda preservada | Ninguno para alcance actual | Conservar evidencia; 3 contratos futuros pendientes | [PR34](https://github.com/jmartinlabs/myfinanzas-app/pull/34), [testplan06](06-deuda-testplan.md) |
| E2.1 / spec07 | Cerrada documental | Aprobada e integrada PR37; auditoría de Álex favorable | Dev07 autorizado expresamente en ejecución actual | Spec/wireframes aprobados; aceptación funcional pendiente | E1.3/E1.4 integradas; AC2 futuro depende Comida | Coordinador | Ninguno documental | Reutilizar sin reabrir decisiones | [PR37](https://github.com/jmartinlabs/myfinanzas-app/pull/37), main c04dc07 |
| E2.2 | Futura | Roadmap aprobado; sin spec/dev nuevos autorizados | not-ready | no ejecutado | E1.1/E1.2/E1.6; P3/R3 | Sin trabajador | E1.6 satisfecha; permiso específico pendiente | No iniciar | [roadmap](roadmap.md) |
| DEV32 / AC22 | Pausa independiente | Spec PR29 aprobada, aún no integrada; no nueva continuación | 23/24; AC22 pendiente | Revisión independiente NO iniciada | Orden PR29 → PR30 | PR30 Draft; feat/32-ejecucion-rootless; fuera de los worktrees actuales | Pausa expresa; suficiencia AC22 pendiente | Conservar checkpoint sin investigar ni modificar | PR30 a09011224e248edcc83080363660a237d409a7d8 |

## Paquetes activos y ownership

| Paquete | Estado | Escritura exclusiva | Límites / retorno |
| --- | --- | --- | --- |
| DEV06 | Cerrado e integrado PR34 | Código/tests E1.6 y progress06/testplan06 en worktree e16 | 30 AC actuales; 3 futuros separados; candidato/SHA y evidencias reales; sin tablero/infra/spec07 |
| SPEC07 | Cerrado e integrado PR37 | Documentos specs/07-* en worktree e21 | Nueva autorización dev07 registrada abajo; sin código/tablero/infra |
| QA06 | Completado sobre f2bfc1b; cuatro hallazgos iniciales corregidos | Lectura y probes propios en worktree qa06; sin cambios a candidato | Independiente de autor; SHA fijo, AC/regresiones/seguridad/persistencia; no merge |

Los agentes reciben templates/agent-work-packet.md como contrato en su contexto.
Sin delegación recursiva; máximo dos trabajadores simultáneos. QA reutilizará capacidad
al terminar SPEC07 o DEV06. Solo coordinador escribe este tablero en
`chore/orchestrator-execution`; no comparte archivos de escritura con trabajadores.
Worktrees separados; suites con puerto3001 se ejecutarán de forma serial.

## Checkpoint de infraestructura preservado

Recuperados progress32/testplan32 e investigación existente desde SHA a090112, solo lectura.
Tres CI de a090112 confirmadas completed/success: rootless39739941226,
Validate PR39739941392 y push39739935397. Esto no cierra AC22.
Candidato86b1570/B5 demuestra carrera concreta de identidad y corrección mediante
snapshot, no causalidad del fallo histórico E1.4. R6, fsync post-rename y fallo API
histórico permanecen abiertos. Sin nuevas investigaciones, cambios, reruns o agentes infra.
No hay dependencia dura documentada de Dev32 para iniciar E1.6.

## Handoff y gates

Coordinador encadena dev → QA → correcciones técnicas autorizadas → verificaciones → PR.
Merge requiere permiso expreso de esa PR. E2.1 se detiene en decisiones nuevas y
aprobación de especificación; aprobar spec no autoriza desarrollo.
No trabajo entre sesiones ni control de chats externos. Reconciliar SHA/diff/evidencias
antes de publicar; preservar cambios y no declarar PASS o completado sin verificación.

## Historial metodológico

Ensayo PR32 ADOPT-RO-1/2 completado, lectura sin escrituras; no se repite para demostrar
herramientas. PR24 integrada b60def1. Estado anterior de tablero (PR32 Draft y dev06
sin autorización) queda sustituido por esta reconciliación y permisos expresos actuales.

### Actualización de paquetes
SPEC07 devuelve brainstorming07 sin commit ni aprobación, en worktree e21.
Q1 y la dependencia real Comida (E3.5 para aviso AC2) se han presentado al usuario.
No se ha rebajado AC2 ni cambiado roadmap. QA06-DESIGN completado en lectura por
/root/spec07; matriz AC01–30 y contratos31–33 revisados, sin suites ni PASS inventados.
Plaza disponible para QA ejecutable tras candidato; DEV06 continúa en su worktree.

### QA06 — primer candidato
Candidato67f2dbd en checkout QA aislado. QA reprodujo: extraordinaria UI con desglose
null rechazada; exceso aplicado indebidamente a precontrol; apertura productiva v6
sin migrar a tablas nuevas. Hallazgos enviados a DEV06 para corrección y regresiones
dentro de la spec aprobada. No aceptación global ni PR lista. Developer continúa
pruebas/UI mientras QA revisa el SHA fijo; no suites compartiendo puerto3001.

### DEV06 — verificación en curso
Developer informa correcciones de los cuatro hallazgos, API96 PASS/1537 aserciones,
typecheck/build PASS y prueba multiproceso v6→v7/IDs/reintentos/exceso. Evidencia
definitiva se consolidará por SHA en testplan06; no se trata como aceptación final.
Playwright E1.6/restoreMFA y capturas390/1440 en ejecución exclusiva de Developer;
QA no usa simultáneamente los puertos de esos servidores.

### Respuestas expresas E2.1 — 2026-10-22
Usuario confirma permitir rectificación con revisión de impacto (Q1) y especificar
operación disponible conservando AC2 pendiente hasta integrar Comida. No se declara
AC2 cumplido ni aprobada la especificación/wireframes. Tras cerrar QA06, el trabajador
Functional completará propuesta07 sin implementar E2.1.

### Candidato E1.6 corregido
Código3239c2d: Developer confirma API97 PASS/1547 aserciones, Playwright2 PASS47s,
typecheck/build y controles18+22 PASS. QA independiente confirma probes originales
corregidos y suite enfocada Deudas10 PASS/166 aserciones. Se añade aún resumen
visual capital/intereses en auditoría; se verificará incremental antes de cerrar.

### QA06 — cierre de código
Código final f2bfc1b0b3e0b86ae4232d3ee30d896f8b47b6f0, sin bloqueantes detectados
por QA independiente. Probes originales corregidos; ejecución QA propia:10 Deudas/166
aserciones y9guardas productivas/67aserciones PASS sobre3239c2d. Backend idéntico en
f2bfc1b; cambio incremental resumen auditoría capital/intereses revisado y E2E afectado
Developer1 PASS28.1s. Suite completa DeveloperAPI97/1547 yE2E2/47s sobre3239c2d.
No se atribuyen esas suites a QA. Historial de cuatro commits de desarrollo revisado
sin secretos/DB/datos reales detectados; solo fixtures y capturas ficticias. CI remota
y revisión del commit documental final pendientes antes de entregar PR.
SPEC07-FINAL en curso por mismo trabajador: propuestas pendientes de aprobación final,
sin implementación ni tercer trabajador. Dev32 conserva pausa expresa.

### Entrega del coordinador
Conciliado cierre QA f2bfc1b y documentación final fbcf423; los cuatro commits de
tablero se incorporan por el coordinador a feat/06-deuda, único escritor de tablero.
Rama preparada para PR hacia main; [comparación](https://github.com/jmartinlabs/myfinanzas-app/compare/main...feat/06-deuda).
Resultados remotos vigentes se consultan por SHA en la PR, sin inferirlos de pruebas
locales. Merge sigue pendiente de autorización expresa. SPEC07-FINAL completa
propuesta documental con las respuestas recibidas; spec/wireframes no aprobados.

### PR34, corrección de fixture CI y propuesta07
[PR34](https://github.com/jmartinlabs/myfinanzas-app/pull/34) abierta, sin merge.
SHA5c1e4f0: CI push39752272341 yPR39752340189 FAILURE, API96/97; únicamenteD4
rechazó un sidecar de fixture sin0600. E2E remoto no ejecutado por ese fallo.
Reproducción determinista umask022 falló; fix28cb52c limita cambios a creación privada
fixturev6 desdeprimeropen y negativoWAL0644. Ningún cambio producto/guardas/infra32.
Developer: API íntegra bajo02297 PASS/1557aserciones. QA independiente: D4 bajo022
1 PASS/84aserciones, rechazo inseguro y snapshot/identidad/clave intactos; revisión
de diff sin bloqueantes. Se publica fix y se verifica nueva CI por SHA en PR34,
sin rerun manual ni conversión retrospectiva de los fallos en PASS.

SPEC07-FINAL completado: brainstorming yspec07 en worktreee21, propuestas sin commit
ni implementación,26ACoperación y3contratos integración. Q1/Q2 confirmadas; spec y
wireframes390/1440 requieren aprobación final. E2.1-AC2 sigue pendiente hastaComida.
Validación documental PASS. Los documentos se preservan sin declarar spec aprobada.

El cierre de esta ejecución espera únicamente CI dePR34 y revisión del usuario:
mergePR34 y aprobaciónspec07 son gates distintos; ninguno autoriza despliegue ni
dev07 por inferencia. Dev32/PR30/AC22 continúa PAUSED; checkpoints sin modificación.

## Estado vigente tras aprobación del usuario — 2026-10-22
Este apartado sustituye los gates pendientes de los registros históricos anteriores.
Usuario «dale»: integración de PR34 y cierre documental spec07/wireframes aprobados.
PR34 MERGED, squash cb9ba3b93dc12a4107f063930bca0b48b67babbe, HEAD81ca2cdd
y CI push39753174309/PR39753182014 SUCCESS comprobados. Main y worktree e21
sincronizados preservando los borradores. Ningún cambio de producto al integrar.

| Item | Estado vigente | Siguiente acción / gate |
| --- | --- | --- |
| E1.6 | Integrada PR34; aceptación actual y QA cerradas; 3 contratos futuros separados | Consultar CI de main por SHA; no despliegue |
| E2.1 / spec07 | Spec y wireframes aprobados; 26 criterios operativos y 3 integraciones futuras | Preparar PR documental y verificar CI; merge de nueva PR requiere permiso |
| E2.1 / dev07 | NO autorizado | Permiso expreso de desarrollo por entrega, además de spec integrada y dependencias |
| Dev32 / PR30 / AC22 | PAUSED, checkpoint intacto | No investigar, corregir ni integrar |

No subagentes nuevos: cierre documental por coordinador, cuota eficiente. Los
worktrees y temporales previos se conservan; ningún recurso con trabajo pendiente
se elimina. Aprobar spec07 no autoriza automáticamente desarrollo ni su nuevo merge.

## Cierre documental E2.1 autorizado por Álex — 2026-10-22
Auditoría funcional y documental de [PR37](https://github.com/jmartinlabs/myfinanzas-app/pull/37)
favorable. Spec07 y wireframes aprobados; permiso expreso de squash condicionado
a ambas CI SUCCESS del HEAD final y ausencia de conflictos. Se corrige únicamente
la cabecera del brainstorming y se conserva su trazabilidad; ningún cambio de
alcance, wireframes, criterios, código, SQL o infraestructura. Estado efectivo de
integración y SHA de main: registro Git de PR37 y sus Checks, verificados al cerrar.

| Línea | Estado documental / autorización | Próxima acción |
| --- | --- | --- |
| E2.1 / spec07 | Aprobada por Álex; cierre de PR37 autorizado con gates CI/HEAD | Integrar/verificar y presentar plan dev07 |
| E2.1 / dev07 | NO autorizado; 26 AC operativos y 3 contratos futuros | Revisar plan antes de dar permiso expreso |
| E2.1-AC2 | Pendiente hasta motor real Comida E3.5 | No simular conciliación ni declarar PASS |
| Dev32 / PR30 / AC22 | PAUSED; checkpoint preservado | Sin investigaciones ni cambios |

Preparación técnica/pruebas permitida en lectura; sin nuevos subagentes ni
implementación durante este cierre. tblCiclos sigue único maestro, saldo Comida
manual sin propagación, IDs y Movimientos originales preservados.

## Ejecución DEV07 autorizada — 2026-10-22
Fuente: mensaje expreso «Álex — Autorización $dev 07 · E2.1 Operación de Ciclos».
Autoriza los cinco incrementos, pasos técnicos ordinarios, Developer y QA independiente
con worktrees aislados, máximo dos trabajadores en esta ejecución. No es límite
permanente del orquestador. Spec07 integrada PR37, main c04dc07 verificado limpio y
sincronizado. CI del HEAD final1edccec push39790248100/PR39790254659 SUCCESS y
CI de main39790748788 SUCCESS. Los gates históricos de no iniciar dev07 quedan
sustituidos únicamente por esta autorización expresa, sin nuevos permisos por analogía.

| Paquete | Estado | Ownership / aislamiento | Gate y retorno |
| --- | --- | --- | --- |
| DEV07 | implementado; verificación global BLOQUEADA por AC23/API105/1 | /root/dev07; feat/07-ciclos-operacion; worktree dev07; código/tests y progress07/testplan07/contexto | 26 AC reales; 3 futuros separados; commits y evidencia por SHA; sin tablero/infra |
| QA07 | dictamen funcional favorable sobre53cc238; gate global abierto | /root/qa07; qa/07-ciclos-operacion; worktree qa07 | Revisión independiente y pruebas reales; sin editar producto ni tablero |
| COORD07 | activo, único escritor de este tablero | chore/07-coordination; worktree coord07 | Encadenar Developer → QA → correcciones → checks → PR; nunca merge sin permiso |

La ejecución conserva maestro único Ciclos, revisión antes/después/motivo/confirmación,
hechos originales, saldo Comida manual sin propagación, concurrencia/idempotencia/
auditoría y continuidad v7. E2.1-AC2 sigue pendiente hasta ComidaE3.5; no se finge
conciliación, cierre ni motor futuro. Nuevas decisiones financieras no cubiertas se
detienen para aprobación. Sin datos reales, Excel, despliegue o migración operativa.
Dev32/PR30/AC22 PAUSED. No agentes infra ni investigaciones salvo bloqueo demostrado.
QA se activa al existir candidato, evitando trabajadores o suites duplicadas.

### Primer candidato DEV07 y relevo QA
SHA3834ca9 contiene backend de operaciones revisadas, extensión v8 del maestro
existente y continuidad v7. Developer informa typecheck PASS y3 pruebas/36
aserciones PASS; no es aceptación completa ni cobertura UI. QA07 independiente
activado sobre ese SHA fijo, con probes y revisión sin escritura de producto.
Developer continúa UI/cobertura en su checkout. API completa reserva3001 de forma
exclusiva; Playwright se coordina, sin suites competidoras sobre los mismos puertos.

### QA07 — revisión inicial del backend
QA independiente sobre3834ca9: suite enfocada3 PASS/36 aserciones, sin atribuir
cobertura UI. Dos brechas reproducidas enviadas a Developer: detalle omitía hechos
con mismo ID de Ciclo pero periodo visible cambiado; replay aceptaba campos extra
derivados antes de validación estructural. Sin mutación de hechos ni bypass
financiero demostrado. Se corrigen dentro del contrato aprobado AC07/09/21,
con regresiones. Continuidad productiva/restore/procesos y UI requieren candidato
ampliado; no se declara aceptación global ni PR lista.

### Candidato ampliado y revisión de correcciones
DEV07 SHA5787c39 añade UI de operación/historial y regresiones O8 de los dos
hallazgos iniciales. Developer informa8 pruebas nuevas/154aserciones PASS,
typecheck PASS y regresión enfocada41/862 PASS; suite completa final pendiente.
O4/O7 cubren continuidad v7 con historia/MFA demo/productiva ficticia, restore y
concurrencia real; QA los contrastará de forma independiente. Primer run íntegro
94/100 con6fallos estructurales conservado, sin rebajar reglas ni ocultar fallos.
QA07 reactivado sobre5787c39; Developer amplía E2E y validaciones finales.

### Verificación global bloqueada y análisis acotado
Candidato53cc238 (código/E2E d63442e): Developer informa Playwright2 PASS/47,6s,
types/build y controles PASS. Suite API completa105 PASS/1 FAIL de106: escenario
heredado E1.4 de apertura concurrente v3, operación upgrade/fase open, SQLite
UNCLASSIFIED errno11 en database-identity.ts:13:6. Una repetición afectada12/270
PASS y un único control base c04dc07 de coordinador1/18 PASS NO cierran ni
atribuyen ese fallo. AC23/gate global permanece BLOQUEADO.

Bajo la excepción expresa del usuario para un bloqueo demostrado se permite
triage limitado en lectura/probe para distinguir handle immutable frente a live;
no cambios de apertura/guardas, no bucles hasta verde, no reanudación Dev32.
Se aporta resumen B5 ya recuperado para no repetir investigación ni atribuirle
nuestro errno11 por analogía. Si requiere alterar frontera de seguridad o alcance
externo, se detiene para decisión expresa. QA07 revisa producto/AC/diffs de53cc238
en paralelo sin servidores ni duplicar diagnóstico. No se declara entrega lista.

### Cierre QA funcional y bloqueo residual
QA final53cc238, código d63442e: sin nuevos defectos funcionales; hallazgos iniciales
corregidos. Ejecuciones propias: suite enfocada8/154 PASS, probes3/22 PASS y
O9 adicional1/17 PASS. Revisó E2E real2 PASS/47,6s y capturas, código/historial
publicable sin borrados, bases, secretos ni datos reales observados. Dictamen
funcional favorable; aceptación global sigue BLOQUEADA (API105/1, AC23).

Triage único con dos procesos y barrera no reproduce errno11: ambos exit0,
lecturas immutable/live correctas y DDL8 ejecutado una vez. No identifica handle
del fallo original ni prueba causa. Apertura/guardas idénticas a main c04dc07,
sin cambios de producto por diagnóstico. No hay corrección causal propuesta.
El próximo diagnóstico posible sería instrumentación por handle/etapa en ruta
heredada, separado del producto E2.1 y sin reactivar Dev32; no se introduce aquí.

Entrega prevista: PR funcional DRAFT con evidencia y bloqueo explícito; verificar
CI por SHA sin convertir un éxito posterior en cierre del fallo local. Ningún
merge autorizado. Los 3 contratos futuros siguen PENDING y E2.1-AC2 hasta Comida.


### Handoff de sesión — 2026-10-22 — STOP REQUESTED — NO AUTO-RESUME

E2.1 queda congelado a petición expresa del usuario. Checkpoint e inventario:
[progress07, apartado Handoff](07-ciclos-operacion-progress.md#handoff--2026-10-22--stop-requested--no-auto-resume).
Origen publicado7b7cfce; código d63442e, QA53cc238. CI push39796609691 SUCCESS
no cierra API local105 PASS/1 FAIL errno11: AC23/global BLOQUEADO. No existe PR
funcional de esta rama. No se crea PR ni se continúa investigación o desarrollo.
Runtime sin trabajadores visibles; controles dev07/qa07 not_found, terminación
de proceso no confirmable. Dev32/PR30/AC22 continúa pausado. Próxima sesión:
leer checkpoint y verificar estado antes de proponer continuación; requiere nueva
instrucción del usuario, sin auto-resume.
