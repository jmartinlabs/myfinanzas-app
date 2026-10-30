# 16 — E3.4 Revisión bancaria de Comida: progreso DEV16

Status: DEV16 en revisión. Implementación, integración con `main` y QA independiente
del delta completadas; sin merge, despliegue, Excel ni datos reales. Cobertura por AC en
[16-revision-comida-testplan.md](16-revision-comida-testplan.md).

## Autorización y preflight

- Paquete: DEV16 — E3.4 Revisión bancaria de Comida.
- Base documental inicial: PR79 + PR80; `origin/main` `dc48f42`.
- Autorización de implementación y QA: usuario, 2026-10-26.
- Autorización de integración final: usuario, 2026-10-26; merge de `main` en la misma
  rama, sin rebase ni force-push; sin merge de PR.
- Checkout aislado:
  `/private/var/folders/45/l03g6c0x15748l6t9c0f7zm80000gp/T/opencode/dev16`.
- Rama: `codex/dev16-revision-comida`; PR #82.
- Datos exclusivamente ficticios. Sin Excel, bases reales ni secretos.

## Alcance implementado

- Esquema técnico v16: `revision_comida` (Detalle/Reposicion en identidad numérica
  compartida), auditoría append-only, intentos24h, contador atómico y marca histórica
  de doble columna de solo lectura.
- API MFA/Origin/CSRF: consulta/ficha, alta, rectificación, anulación lógica y
  vínculo/desvínculo de operaciones y reposiciones; idempotencia y revisión.
- Fuente `Revisión Comida` integrada en la referencia temporal central; `tblCiclos`
  sigue siendo el único maestro temporal.
- UI 390/1440: listado, ficha, formularios, vínculo, reposiciones y estados
  vacío/carga/error/409/422/404 con foco y teclado.
- Sin Gastos, Movimientos, saldos paralelos, ejecución presupuestaria ni efectos
  adicionales en Saldos centrales.
- Integración con main: Vehículos v14 y Compartidos/Base B v15 preservados; Revisión
  Comida v16. `assertV14VehicleContract` y fixtures v13/v14/v15 conservados.

## Incrementos

| # | Incremento | Estado |
| --- | --- | --- |
| I1 | Testplan/progress y matriz AC inicial | completado |
| I2 | Esquema v16, continuidad v13/v14/v15→v16, backup/restore y contador | completado |
| I3 | Dominio/validación/auditoría/idempotencia y fuente temporal | completado |
| I4 | API y permisos | completado |
| I5 | UI 390/1440, teclado, foco y estados | completado |
| I6 | Pruebas API/SQLite/HTTP y E2E | completado |
| I7 | Verificación, CI Linux y QA independiente del delta | completado |
| I8 | Publicación de rama y PR | completado; merge no autorizado |

## Checkpoints

### 2026-10-26 · I1 preflight y plan

- Base `dc48f42`; rama `codex/dev16-revision-comida`; sin DEV16 previo.
- Plan: esquema, fuente temporal, dominio, API, UI y pruebas; conservar los 37 AC.
- AC-27/34/36 no se simulan; AC-12/31 condicionales; AC-23/25 documentales.

### 2026-10-26 · I2–I6 candidato local

- Archivos principales: `revision-comida-schema.ts`, `revision-comida-ledger.ts`,
  `revision-comida.ts`, `revision-comida.test.ts`, `revision-comida-backup.test.ts`,
  `RevisionComida.tsx`, fixture y servidor E2E; integración en `database-schema.ts`,
  `database-identity.ts`, `backup.ts`, `ciclos.ts`, `app.ts`, `main.tsx`, `style.css`.
- Evidencia por AC en el testplan. Contratos futuros y documentales sin PASS.

### 2026-10-26 · Integración de main f5bf032 (histórico)

`main` avanzó a `f5bf032` (Vehículos v14). Se integró preservando Vehículos y Revisión
Comida; después `main` volvió a avanzar y esa integración quedó superada por el
checkpoint final. Se conserva como historia, no como estado vigente.

### 2026-10-26 · Integración final de main 5ad75ed y esquema v16

- `main` remoto verificado en `5ad75ed` (Compartidos/Base B v15).
- Merge de `origin/main` en `codex/dev16-revision-comida`, sin rebase ni force-push.
- Conflictos resueltos preservando Vehículos v14 y Compartidos/Base B v15.
- Revisión Comida pasa a **v16**:
  - `revisionComidaSchema` actualiza `schema_version` a 16;
  - `database-identity` admite 1–16;
  - `database-schema` aplica vehículo `<14`, compartido `<15`, revisión `<16`;
  - contadores `participantes_compartido` y `revision_comida`;
  - intentos `compartido_attempts` desde v15 y `revision_comida_attempts` desde v16;
  - backup/restore con etiquetas `e3.3-v14`, `e3.2-v15`, `e3.4-v16`;
  - fixtures genuinos v13/v14/v15 y continuidad hasta v16.
- Archivos de conflicto resueltos: backup, database-schema, cycle-operations, deudas,
  planes-ciclo, referencias, vehiculos-backup, database-v14 y main.tsx; CSS y app.ts
  auto-mergeados y revisados.
- `specs/epic-board.md` solo incorpora el cambio de `main`; DEV16 no lo editó.

### 2026-10-26 · Candidato final y CI Linux

- Candidato de código: `77a311d` (merge `d179515` + fix de backup v16).
- HEAD de la rama: `77a311d`; PR #82 abierta entonces; integrada después por squash
  `26b6f0c`. Nota de vigencia 2026-10-29: AC25 físico sigue abierto.
- CI Linux [run 40410650558](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/40410650558):
  **PASS**; baseline 1m6s, full 4m28s, required 7s.
- Full API: **259 PASS / 0 FAIL / 3.721 expect** en 25 archivos.
- E2E: **11 PASS**.
- AC-21: `(pass) AC21: restore cifrado v16 conserva operaciones, devoluciones,
  reposiciones, vínculos, evidencias y auditoría`.
- `Application phase: PASS`; artefacto de capturas ficticias disponible.
- Local macOS: focal 15/215 PASS; typecheck/build/E2E propio/baseline PASS. Full API
  local 212/47: 47 fallos de plataforma `libc.so.6` (base main 5ad75ed 197/46; el fallo
  adicional es el test de restore v16, que CI Linux ejecuta PASS).

## QA independiente

- Sesión independiente: `ses_e8658f75cffe04NrnMEjcapIYt`; no editó, commiteó ni publicó.
- Ronda 1 `c59cc84`: FAIL; cobertura «Completa», filtro «Todos», coincidencia y
  evidencia AC-35. Corregidos.
- Ronda 2 `265bea7`: PASS de código con AC-35 parcial. Corregido en `36a81a2`.
- Ronda 3 `36a81a2`: PASS; AC-35 PASS, AC-21 parcial en ese momento.
- Ronda final delta `36a81a2..77a311d`: **PASS técnico** de integración, esquema v16,
  migraciones, backup/restore, AC-21 v16 e invariantes financieros. Solo detectó
  documentación desactualizada (v15/CI antiguo), corregida en este documento.
- QA confirmó preservación de Vehículos/Compartidos y que `specs/epic-board.md` solo
  refleja el cambio de main.
- AC-21: PASS en CI Linux v16; local macOS UNRUN por `libc.so.6`.
- AC-35: PASS. AC-25 abierto; AC-27/34/36 futuros no simulados; AC-12 C con fixture;
  AC-31 UNRUN/C.

## Pendientes y límites

- AC-25 abierto: sin contraste físico acreditado de v5.11(7); no se declara equivalencia.
- AC-27/34/36: contratos futuros E3.5; no simulados.
- AC-12/31: históricos condicionales; solo fixture sintético y UNRUN/C.
- Sin Excel, datos reales, B3/Dev32, despliegue ni merge.
- Merge de PR #82 requiere aprobación expresa del usuario.


## COMIDA-UNICO-01 — checkpoint documental 2026-10-30

D1–D5 aprobadas por mensaje directo del usuario; registro canónico en
[specification](16-revision-comida-specification.md#comida-unico-01--candidato-de-refinamiento-revisión-1-2026-10-30).
Base main remota verificada: `454d21a`; rama `codex/spec16-comida-registro-unico`.
Consolidación de candidato, análisis de dependencias y cobertura CU-01–CU-12; sin código,
schema ni datos. P1/P2/P4/P5 y spec/wireframes completos pendientes; C/B reales y activación
siguen separados. DEV18 permanece STOP. No hay escritores delegados en esta entrega.
La auditoría previa y el handoff local se preservan; no se incluyen en este cambio.

QA documental independiente: subagente `qa_spec16`, solo lectura, corrigió atribución de
relay 0006 (síntesis Codex, no respuesta Álex); sin otros hallazgos materiales.
Modelo/effort solicitado explícitamente `gpt-6.1-sol`/`low`, contexto nuevo; selección
efectiva no expuesta en metadatos de retorno, no se declara verificada.
Cuota consultada: 85% restante ventana 300 min y 92% semanal; sin despacho adicional.
Consumo Actions N/D: Billing API requiere scope `user` ausente; sin ampliar permisos.
Python sistema 3.9.6 no cumple prerrequisito; verificación usa Python 3.12 disponible.
Pruebas de aplicación UNRUN: solo documentación; no hay candidato funcional.

### Aprobación P1 — 2026-10-30

Usuario: «Apruebo P1: nuevo tipo Devolución de gasto». Registro canónico actualizado
en specification; brainstorming conserva confirmación append-only. Sin implementación.
P2/P3/P4/P5 y spec completa permanecen pendientes; siguiente gate P2.

### Aprobación P2 — 2026-10-30

Mensaje humano directo: «Apruebo P2: mantener ING Comida como el mismo Saldo, con
régimen fechado sujeto a verificación». Registro en specification y brainstorming.
Matriz de consumidores y condiciones de bloqueo documentadas; sin código ni esquema.
P3/P4/P5 y spec/wireframes completos pendientes. Próxima decisión funcional: P4.

### Aprobación P4 — 2026-10-30

Usuario: «Apruebo P4: compra y Partida opcionales con evidencia y revisión; vínculo
íntegro sin reparto parcial». Registro canónico en specification; confirmación
append-only en brainstorming. Retirada la propuesta de atribución parcial implícita
20/25; banco conserva +25 y el vínculo íntegro de 13 queda Revisar. Sin código/schema.
Siguiente decisión P5; P3 y aprobación de spec/wireframes completos siguen separados.

### Aprobación P5 — 2026-10-30

Usuario «Apruebo P5» tras solicitud única de Ejecutado mensual neto y devolución
anterior separada sin liberar presupuesto. Consolidado en specification/brainstorming;
CU-13–CU-16 UNRUN. Anual y S de SPEC12 conservan bruto con límites explicados.
Sin código/schema. Siguiente trabajo: cerrar detalle técnico y revisión de candidato
completo/wireframes; P3 operativo sigue pendiente y no autoriza activación.

### Aprobación P6 — 2026-10-30

Usuario «Apruebo P6»; registro canónico en specification y confirmación append-only
brainstorming. CU-17–CU-20 UNRUN; sin código ni datos. Fuente de Recursos/cierre no
acreditada: se necesita fórmula/criterio verificable sanitizado; no se infiere desde
S0/B ni DEV18. P3, detalle técnico y spec/wireframes completos siguen pendientes.

### Propuesta P7 y procedencia de fuente — 2026-10-30

Usuario confirma haber proporcionado libro y autoriza preparar adaptación («vamos»).
Relay0020/21 reporta extracción de v5.11(20261030-155958), no equivalencia con (7);
Codex verificó mensajes, sin inspección física propia ni datos reales incorporados.
P7 propuesta en specification, ejemplos/puente y CU21–24 UNRUN. Fuente disponible con
procedencia delimitada sustituye bloqueo de ausencia absoluta; adaptación financiera
sigue pendiente de aprobación P7. Sin código, activación, C/B real ni merge.

### Aprobación P7 — 2026-10-30

Usuario «Apruebo P7» sobre propuesta 96a07d1. Contrato y casos actualizados sin
modificar fórmulas: Recursos R_caja, Falta R_obl, cierre analítico y banco separados.
Sin código/schema/datos. P3, activación y aprobación completa de spec siguen separados.

### Contrato completo candidato revisión 2 — 2026-10-30

Concretados datos propios, relaciones, API/DTO, huellas/transacciones, alcance inicial
ING Comida, continuidad v18 y plan incremental. Sin implementación; revisión completa
independiente y verify docs por SHA final antes de solicitar aprobación. P3 separado.

### Observaciones externas 0022 — 2026-10-30

Álex FAVORABLE CON OBSERVACIONES, no aprobación de revisión2. Clarificada Falta como
obligación económica, no cantidad para restaurar ING; caso100/50/15externo/20 produce
Falta15 y banco70, sin nueva métrica ni hecho. Testplan histórico rotulado superado.
Duración provisional del ciclo abierto requiere fórmula/criterio físico y posible
enmienda de P7 aprobada. Aprobación completa suspendida hasta resolver; sin código.

### Aprobación P7a y cierre documental de observaciones — 2026-10-30

Usuario «Apruebo P7a». Fuente0024 reporta E5/D14: horizonte fin mes financiado,
duración provisional34 en ejemplo Inicio28/10; política aprobada No disponible al
vencer horizonte. Se sustituye explícitamente restricción P7, sin inventar Fin.
Observación1/limpieza verificadas por Álex en0024; observación2 incorporada tras
aprobación humana. Candidato revisión3 y wireframes pendientes de aprobación completa;
CU01–24 UNRUN, sin código/schema/datos, P3 y activación/merge separados.
