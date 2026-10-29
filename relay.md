# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 27
message_id: 222d1789-d705-4cda-b48e-a16a7daea62c
from: OpenCode
to: Alex
reply_expected: true
read_by: none
in_reply_to: 26
created_at: 2026-10-29T13:04:45Z

## Message

# MyFinanzas · retorno 0027 — auditoría consolidada y lotes propuestos

**Para:** Álex, auditor
**De:** OpenCode, coordinador
**En respuesta a:** 0026
**Modo:** solo lectura. No se ha modificado ningún fichero, tracker, rama, PR ni ejecutor; no hay merge ni despliegue.

## 0. Límites de este retorno

- He procesado 0026 como encargo de Álex. El «origen explícito del usuario» que cita el mensaje no es verificable desde el relay; **no lo convierto en autorización de escritura**.
- La clasificación consolida tu tracker `147008f` con contraste propio de Git/PR/CI/estado actual. **No es una reauditoría independiente de las 25 SPEC**: no he repetido las pruebas ya concluidas ni he abierto el Excel físico.
- Nada de lo que sigue autoriza correcciones, PR, merge, despliegue ni reanudación de DEV18/E3.5, DEV17, B3/DEV32 o PR50/PR51.

## 1. Base verificada (2026-10-29, ~14:05 CET)

| Elemento | Estado comprobado |
|---|---|
| `main` / `origin/main` | `2c97a66a111ee13dc5709e0a27b1032d8fe86dc8` (coinciden) |
| PR #128 | MERGED por squash `2c97a66`; CI premerge `40871067484` success en `b1e1149`; postmerge `40872519671` success en `2c97a66` |
| `audit/spec04-25` | `147008f077cf557f05f100de62144e1d7fd58362`; solo remota; propiedad de Álex |
| Divergencia auditoría/main | **Solo** `specs/investigations/spec-audit-tracker.md` (+1910/−37). Rama 38 commits por delante y 5 por detrás de `main`; base común `5570d89` |
| Relay `r-p946386y` | HEAD `677e526`; secuencia 0026; este retorno será 0027 |
| PR abiertas | #51 y #50 abiertas, no draft, sin tocar; #30 **draft**, head `24ca206`, `mergeable` |
| PR #30 vs `main` | Rama con `schemaVersion = 16`; `main` con `schemaVersion = 18`; base común `26b6f0c`; **43 commits por detrás de main** y 36 propios. CI final success sobre `24ca206` tras reintento, pero anterior a v17 (#90) y v18 (#95) |
| Árbol local | Limpio salvo `specs/session-handoff.md` sin seguimiento; sin stashes |

## 2. Clasificación de las 25 SPEC

Categorías: **CERRADA**; **FIX INTEGRADO / SPEC ABIERTA**; **DOCUMENTAL** (solo vigencia/estado); **ACEPTACIÓN** (pruebas/equivalencia pendientes); **DEV FUTURO** (no autorizado); **BLOQUEO** (técnico o de integración).

| SPEC | Entrega | Estado vigente | Categoría | Siguiente gate |
|---|---|---|---|---|
| 01 | E1.1 | Cerrada; PR #115 `e4a26de` | CERRADA | Ninguno |
| 02 | E1.2 | Cerrada; PR #117/#119 | CERRADA | Ninguno |
| 03 | E1.3 | Cerrada; PR #122 `52eaec0` | CERRADA | Ninguno |
| 04 | E1.4 | H-SPEC04-04/02/03 integrados #125 `e3ebd76`; sin cierre formal; E2E/full UNRUN | FIX INTEGRADO / SPEC ABIERTA + ACEPTACIÓN | Aceptación E2E/full sobre candidato; no reabrir reglas |
| 05 | E1.5 | En inspección; H-SPEC05-01 documental (D5/Exterior «no vigente» pese a #84/#90) | DOCUMENTAL | Corregir vigencia; sin fallo económico demostrado |
| 06 | E1.6 | En inspección; cabecera cita #24 (documental) y no #34 (funcional); auditoría técnica incompleta | DOCUMENTAL | Aclarar #24/#34; completar contraste técnico |
| 07 | E2.1 | Opción B #128 `2c97a66`; B1/B2/T1 corregidos; AC28/E3.5/inversión/conciliación/cierre PENDING; E2E global UNRUN | FIX INTEGRADO / SPEC ABIERTA + ACEPTACIÓN | Aceptación global; AC28/E3.5 fuera de alcance |
| 08 | E2.2 | #44 `255bf61` integrada; progress pide aprobación de merge | DOCUMENTAL | Nota de vigencia |
| 09 | E2.3 | #57 integrada; progress «EN CURSO/sin merge»; H-SPEC09-01 ambigüedad, no bug | DOCUMENTAL / DECISIÓN | Nota de vigencia; decidir solo si se cambia semántica de Fin |
| 10 | E2.4 | #61 `e1d6dba` integrada; progress «gate Linux pendiente» | DOCUMENTAL | Nota de vigencia |
| 11 | E2.5 | #63 integrada; H-SPEC11-01 ambigüedad de elegibilidad, no bug | DOCUMENTAL / DECISIÓN | No cambiar motor; documentar decisión si se desea |
| 12 | E2.6 | #67 `a445f90` integrada; varios AC parciales/UNRUN | ACEPTACIÓN | Cobertura transversal; no declarar cierre global |
| 13 | E3.1 | #71 `b146eda` integrada; progress «PR71 DRAFT»; AC36 parcial | DOCUMENTAL + ACEPTACIÓN | Nota de vigencia; AC36/conciliación |
| 14 | E3.2 | #75 `5ad75ed` y #90 `cf6954a` integradas; progress «PR #90 Draft»; B-T11 futuro | DOCUMENTAL + ACEPTACIÓN | Nota de vigencia; B-T11 |
| 15 | E3.3 | #81 `f5bf032` integrada; progress «SIN PUBLICAR»; CI Linux/testplan residual | DOCUMENTAL + ACEPTACIÓN | Nota de vigencia; evidencia Linux |
| 16 | E3.4 | #82 `26b6f0c` integrada; progress «PR #82 abierta»; AC25 físico abierto | DOCUMENTAL + ACEPTACIÓN | AC25 con Excel real; no sustituir por fixtures |
| 17 | E4.4 | Spec/wireframes no aprobados; sin progress; 0 pruebas funcionales | DEV FUTURO | No iniciar; decisión de spec |
| 19 | E4.1 | #95 `156a50d` integrada; spec/testplan dicen «PR #95 draft»; 6 AC parciales | DOCUMENTAL + ACEPTACIÓN | Nota de vigencia; AC-03/24/27/30/33/34 |
| 20 | E4.5 | #87 `3d70fd6` documental; testplan contradictorio; 59 AC UNRUN; DEV no autorizado | DOCUMENTAL + DEV FUTURO | Reconciliar aprobación; DT7 |
| 21 | E3.6 | #97 `2364d9c` documental; testplan contradictorio; 31 AC UNRUN; DEV no autorizado | DOCUMENTAL + DEV FUTURO | Reconciliar aprobación; depende E3.5 |
| 22 | E4.2 | Spec/testplan/wireframes aprobados #105; DEV22 no iniciado; queda D7/SPEC19 | DEV FUTURO / DECISIÓN | Resolver D7/SPEC19; luego autorización DEV |
| 26 | E4.8 | Spec/testplan aprobados #107; AC UNRUN; DEV no autorizado; posiciones a Fin y DT6 abiertos | DEV FUTURO / BLOQUEO | Posición histórica a Fin; DT3/DT4/DT6 |
| 27 | E4.9 | Spec/testplan aprobados #107; AC UNRUN; DEV no autorizado; depende E3.5/FIN_NETA, DT6 y posiciones a Fin | DEV FUTURO / BLOQUEO | E3.5 + DT6 + posición a Fin; sin cierre parcial |
| 31 | SQLite | #25 `511fcba` y #48 `8fae7a4` integradas; cabecera «implementación pendiente»; R6/fsync/runtime Linux sin auditoría completa | DOCUMENTAL + GATE OPERATIVO | Aclarar alcance v6/31-E1; pruebas Linux/seguridad antes de despliegue |
| 32 | Rootless | PR #29 `a7fb9d8` documental; PR #30 draft `24ca206` schema 16 frente a main v18; AC18/AC22 pendientes | BLOQUEO DE INTEGRACIÓN | Reconciliar v18, ampliar rollback/restore y CI rootless; sin merge |

**Balance:** 3 cerradas (01–03), 2 con corrección integrada y SPEC abierta (04, 07), 13 documentales/aceptación (05, 06, 08–16, 19, 31), 6 DEV futuro/bloqueo (17, 20–22, 26, 27) y 1 bloqueo de integración (32). SPEC18/E3.5 queda fuera de las 25 y sigue STOP.

## 3. Hallazgos consolidados (histórico → vigente)

| ID | Estado | Lectura vigente |
|---|---|---|
| H-SPEC04-04 | RESUELTO | 409 `REFERENCE_ERROR` en preview/confirmación; integrado #125 |
| H-SPEC04-02 | RESUELTO | Referencia «después» con fuente central; integrado #125 |
| H-SPEC04-03 | RESUELTO | Huella con referencia efectiva; integrado #125 |
| H-SPEC07-01 | PARCIAL | F1/F2 confirmados; opción B integrada #128; AC28/E3.5/inversión/conciliación/cierre siguen abiertos. F3 descartado |
| H-SPEC32-01 | ABIERTO | PR #30 schema 16 vs main v18; AC18/AC22 y continuidad v17/v18 pendientes |
| H-SPEC26-01 | ABIERTO | `positionsFor` no acepta fecha Fin; bloquea posición histórica de E4.8/E4.9 |
| H-SPEC09-01 | NO BUG | Ambigüedad de Fin temporal; no reabrir motor sin decisión |
| H-SPEC11-01 | NO BUG | Elegibilidad media vs pronóstico; comportamiento vigente coherente |
| R-INV-01 | RIESGO PERMITIDO | Efectivo de bróker negativo tras Compra y rectificación; no inventar veto global |
| H-TRANS-01 y H-SPEC05/06/20/21-01 | ABIERTOS | Estados documentales obsoletos o contradictorios; sin efecto monetario demostrado |
| SPEC16 AC25 | ABIERTO | Equivalencia física con Excel v5.11(7) no verificada; prohibido sustituir por fixtures |
| SPEC31 R6/fsync/runtime | ABIERTO | Integración v6/31-E1 contrastada; seguridad/almacenamiento Linux sin auditoría completa |

## 4. Inventario documental (lote mínimo, sin reescribir historia)

| # | Archivo | Corrección concreta |
|---|---|---|
| 1 | `specs/04-movimientos-specification.md` §Revisión | Nota de vigencia: E1.4 integrada (PR #15 `b51b89b`); retirar la instrucción «integrar PR #14 / esperar dev04» como estado actual |
| 2 | `specs/05-transferencias-referencias-specification.md` L50/L55 | D5/Exterior ya integrado #84/#90 `cf6954a`; sustituir «propuesta (no vigente)» por vigencia y conservar el relato original |
| 3 | `specs/06-deuda-specification.md` cabecera/plan | Distinguir #24 (documental) de #34 (funcional `cb9ba3b`); nota de integración; auditoría técnica sigue abierta |
| 4 | `specs/08-presupuestos-progress.md` L3 | «PR funcional pendiente de merge» → #44 `255bf61` integrada; conservar histórico |
| 5 | `specs/09-plan-ciclo-progress.md` L5/L22 | «sin merge/gate Linux pendiente» → #57 integrada; nota de vigencia |
| 6 | `specs/10-plan-anual-progress.md` L3 | «gate global Linux pendiente» → #61 `e1d6dba` integrada; nota |
| 7 | `specs/13-anticipos-progress.md` L7 | «PR71 DRAFT» → #71 `b146eda` integrada; AC36 parcial se conserva |
| 8 | `specs/14-compartidos-progress.md` L27-L28 | «PR #90 Draft / sin merge» → #90 `cf6954a` integrada; B-T11 futuro |
| 9 | `specs/15-vehiculos-itv-progress.md` L3 | «SIN PUBLICAR» → #81 `f5bf032` integrada; residual Linux/CI explícito |
| 10 | `specs/16-revision-comida-progress.md` L91 | «PR #82 abierta / sin merge» → #82 `26b6f0c` integrada; AC25 abierto |
| 11 | `specs/19-*specification.md` L8/46/88/104/1508 y testplan L37/340 | «PR #95 draft» → #95 `156a50d` integrada; AC parciales se conservan |
| 12 | `specs/20-historico-precontrol-testplan.md` cola | «spec/wireframes no aprobados» contradice cabecera APPROVED; reconciliar a aprobado y dejar DT7/59 AC UNRUN |
| 13 | `specs/21-pendientes-conciliacion-testplan.md` cola | «Aprobación de spec: No concedida» contradice cabecera Q-S21 aprobada; reconciliar; 31 AC UNRUN |
| 14 | `specs/31-sqlite-produccion-specification.md` L2 | «implementación pendiente» → aclarar v6/#25 y 31-E1/#48 integrados; pendiente R6/fsync/runtime Linux |
| 15 | `specs/epic-board.md` checkpoint | Sustituir el checkpoint 2026-10-28 (`a3956cf`) por el vigente `2c97a66`; incluir #128, SPEC04/07 y gates abiertos |
| 16 | `specs/investigations/spec-audit-tracker.md` (main) | Sustituir por el tracker vigente de `audit/spec04-25` `147008f` mediante PR focal (ver §5) |
| 17 | `specs/session-handoff.md` (local) | Relay 0025/`2a4d380` → 0026/`677e526` y estado de este retorno; sigue sin seguimiento |

Regla: añadir notas de vigencia y conservar el texto histórico; no borrar decisiones, evidencias ni relatos de aprobación.

## 5. Reconciliación `audit/spec04-25` → `main`

**Hecho comprobado:** la divergencia es un único archivo. `git diff --name-status origin/main...origin/audit/spec04-25` devuelve solo `M specs/investigations/spec-audit-tracker.md` (+1910/−37). No hay código, specs de producto ni workflows divergentes.

**Estrategia recomendada:** no fusionar la rama larga (38 commits, base `5570d89`). Crear una rama focal desde `main` `2c97a66`, incorporar **solo** el tracker de `147008f`, revisar que sus enlaces/SHAs apunten a contenido presente en `main`, y abrir una PR de un solo archivo con perfil CI `docs`.

- Ventaja: integra el resultado vigente sin arrastrar historia intermedia ni tocar `main` fuera del registro.
- Ownership: el contenido es de Álex. Si prefiere mantener la autoría, Álex crea la rama focal desde `main`; OpenCode se limita a revisar/transportar y no edita hallazgos.
- Prohibido: escribir en `audit/spec04-25`, borrar `evidence/spec07-qa-20261029` o fusionar la rama histórica sin autorización.
- Verificación previa: enlaces a PR/SHA existentes, sin secretos/datos reales, sin referencias a `specs/18-*` como si estuviera en `main`, y `git diff --check`.

## 6. Lotes priorizados

### Lote 1 — Verdad documental y tracker (bajo riesgo, solo documentación)

- **Objetivo:** dejar una única verdad reciente en `main` y en el tablero.
- **Contenido:** los 17 puntos de §4, incluida la PR focal del tracker y el nuevo checkpoint del tablero.
- **Contratos a preservar:** historia, aprobaciones, SHAs, evidencias; no reescribir decisiones ni reclasificar AC.
- **Verificación:** CI `docs`; enlaces/SHA; `git diff --check`; revisión de que no se toca código.
- **Dependencias:** ninguna de producto. Paralelizable con Lote 2 (archivos disjuntos).
- **Riesgo:** bajo. **Aprobación única:** «Apruebo Lote 1 documental».

### Lote 2 — Gate SPEC32 / PR #30 sobre v18 (riesgo medio-alto, infraestructura)

- **Objetivo:** reconciliar el candidato rootless con `main` v18 y demostrar AC18/AC22 antes de cualquier merge.
- **Contenido:** actualizar PR #30 desde `main`; ampliar continuidad v17/v18, fixtures de release, rollback 18→…→restore, snapshot de tablas nuevas y CI rootless; actualizar testplan/progress32.
- **Contratos a preservar:** 31-E1, identidad/backup, sin relajar guardas ni omitir pruebas; no convertir CI verde histórico en aceptación.
- **Verificación:** `scripts/verify --full`, full Linux, rootless, restore/rollback y matriz de esquema.
- **Dependencias:** comparte `database-identity.ts`/`database-schema.ts` con Lote 3; serializar escrituras.
- **Riesgo:** alto operativo. **Aprobación única:** «Apruebo Lote 2 SPEC32/PR30».

### Lote 3 — E3.5 / FIN_NETA (riesgo financiero alto; requiere reanudación expresa)

- **Objetivo:** completar E3.5 y desbloquear E3.6/E4.9.
- **Contenido:** retomar candidato `568bf3e`/doc `94cb6a0`; resolver x86_64 BLOCKED; integrar FIN_NETA y atribución de Comida por Ciclo; conservar AC1–AC3 y evitar doble descuento.
- **Contratos a preservar:** fuente única, separación Comida/Movimientos, protección de Neto apertura, sin reglas nuevas no aprobadas.
- **Verificación:** full Linux, oráculos E3.5, backup/restore, QA independiente.
- **Dependencias:** Lote 2 en archivos de esquema; decisión funcional previa si aparece una regla no aprobada.
- **Riesgo:** alto financiero. **Aprobación única:** «Reanudo y autorizo Lote 3 E3.5» (no auto-resume).

### Lote 4 — Aceptación y gates E4 (riesgo alto, datos/decisiones)

- **Objetivo:** convertir «integrado» en «aceptado» sin falsos cierres.
- **Contenido:** E2E/full de SPEC04 y SPEC07; SPEC16 AC25 con Excel físico v5.11(7); D7/SPEC19 para DEV22; posición a Fin y DT6/T-BKP para SPEC26/27.
- **Contratos a preservar:** no sustituir Excel por fixtures; no declarar PASS global; no iniciar DEV sin autorización separada.
- **Verificación:** evidencia física/real autorizada, E2E global, QA independiente, gates DT6/T-BKP.
- **Dependencias:** autorización de datos reales, E3.5 y decisiones funcionales.
- **Riesgo:** alto. **Aprobación única:** por sub-lote, cuando exista evidencia y decisión.

## 7. Recomendación

**Primero el Lote 1.** Es el único que elimina el riesgo de trabajar sobre estados obsoletos (tablero, tracker de `main`, progress contradictorios) con coste bajo y sin tocar finanzas ni código. Después, **Lote 2 en paralelo** si el usuario quiere atacar el gate de release; **Lote 3 solo con reanudación expresa**; **Lote 4 al final**, porque exige Excel real y decisiones que aún no están concedidas.

No solicito merge ni despliegue. La aprobación de cualquiera de estos lotes corresponde al usuario y debe ser explícita e identificable; este relay no la concede.

**Fin del retorno 0027.**
