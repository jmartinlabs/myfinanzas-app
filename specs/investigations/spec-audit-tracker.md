# Auditoría integral de especificaciones — Registro único

**Status: INSPECCIÓN EXPLORATORIA COMPLETADA — 2026-10-29; auditoría formal ABIERTA.** Las 25 SPEC del inventario tienen primera pasada; se ha realizado una segunda inspección transversal por riesgos en las 22 aún no cerradas. Falta consolidación final/aprobación de lotes y pruebas de aceptación pendientes; este registro no es tablero de desarrollo. Estado funcional global: [epic-board](../epic-board.md).

## Checkpoint vigente — 2026-10-29

- **Base:** `main` `2c97a66` (squash PR #128); registro de auditoría `audit/spec04-25` `147008f`.
- **Balance:** 3 cerradas (SPEC01–03) y 22 abiertas. **Correcciones integradas con SPEC abierta:** SPEC04 (PR #125 `e3ebd76`) y SPEC07 (PR #128 `2c97a66`); E2E/full global UNRUN.
- **Resto:** 13 SPEC en documental/aceptación (05, 06, 08–16, 19, 31), 6 en DEV futuro/decisión (17, 20–22, 26, 27) y SPEC32 como bloqueo de integración (PR #30 draft, esquema 16 frente a `main` v18).
- **Gates abiertos:** SPEC16 AC25 físico; E3.5/FIN_NETA STOP; DT6/T-BKP; D7/SPEC19; posiciones a Fin para SPEC26/27.
- **Nota:** los apartados y SHAs inferiores conservan su valor histórico; este checkpoint no reclasifica AC ni autoriza DEV, PR o merge.

## Estado del inventario

- Base del inventario: `main` `63ee1d0`. `main` al cierre de SPEC03: `52eaec0` (squash de PR #122); segunda pasada contrastada con `1ed2a83`. Históricos: `3d87511` (#120), `5d8f273` (#121), `da93682` (#119), `13cc7c6` (#117), `71866ac` (#116) y `e4a26de` (#115).
- Alcance: las 25 SPEC del inventario autorizado. La auditoría es documental; cualquier
  corrección funcional requiere autorización específica. H-SPEC03-03 y las tres
  correcciones de SPEC04 de PR #125 han sido aprobadas e integradas con sus respectivos
  alcances; no implica autorización de nuevas funcionalidades ni de despliegue.
- **Estado actual:** **SPEC01 CERRADA** — [PR #115](https://github.com/jmartinlabs/myfinanzas-app/pull/115)
  integrada por squash `e4a26de`; validación de Álex sobre `b307c9c`; CI post-merge
  `40728150624` SUCCESS. **SPEC02 CERRADA:** documental #117 (`13cc7c6`) y funcional
  #119 (`da93682`); H-SPEC02-01 resuelto e integrado; validación de Álex sobre
  `6440592`; CI PR `40747193480`, full `40747195074` y main `40748880562` PASS.
  **SPEC03 CERRADA:** [PR #122](https://github.com/jmartinlabs/myfinanzas-app/pull/122)
  (HEAD validado `7483709`; squash `52eaec0`); H-SPEC03-01/02/03 resueltos; validación
  de Álex sobre `7483709`; CI PR `40760689632` critical (298 API PASS) y main
  `40761769656` fast PASS. Las otras 22 SPEC siguen pendientes.
- **Historial inicial:** SPEC01 fue revisada por Álex y quedó pendiente de correcciones
  antes de la PR #115. Se conserva solo como antecedente.
- SPEC01, SPEC02 y SPEC03 son las SPEC modificadas; las otras 22 no se han tocado.

## Integración verificada PR #125 — relay #0022 (2026-10-29)

**Evidencia remota contrastada independientemente:**
relay #0022 de OpenCode, destinatario Álex, informa que
el usuario **autorizó expresamente** el merge.
Álex verifica el resultado publicado en GitHub;
no dispone en este mensaje del texto original de
esa autorización externa. La PR
[#125](https://github.com/jmartinlabs/myfinanzas-app/pull/125)
figura **CLOSED/MERGED**, squash
`e3ebd76e09115469230766bb2f34f78eb39f1ea1`;
`main` apunta a ese mismo SHA. El commit tiene
como único padre `1ed2a834334d94d121df82b77a497a35f75ec50a`
y cambia exclusivamente `apps/api/src/movimientos.ts`
y `apps/api/src/movimientos.test.ts` (+453/−3).

- **H-SPEC04-04 — corregido e integrado en `main`:**
  `plan()` bloquea si `cycleContext(db).referencia.estado === "error"`;
  preview y confirmación de alta/rectificación/anulación
  rechazan `409 REFERENCE_ERROR` sin escritura de
  Movimiento/auditoría/contador/intentona. Controles
  Comida vacía/no instalada no bloqueados.
- **H-SPEC04-02 — corregido e integrado:** referencia
  posterior de Movimiento agrega Movimientos resultantes
  y `revisionComidaSource()`, sin fecha inventada de
  inversión pendiente; casos backdate, rectificación
  y anulación del máximo.
- **H-SPEC04-03 — corregido e integrado:** fingerprint
  local incorpora referencia efectiva
  `{fecha,estado}` antes y después, sin ampliar
  `financeRevision()` global; los cambios de
  fecha máxima de Comida sin efecto material
  no invalidan, y los que cambian la referencia
  propuesta sí obligan nueva vista previa.

**Evidencia de validación:** GitHub run
[40835279386](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/40835279386)
sobre PR HEAD `401bbff3f02c702b690e54afc9356d7af41f94ba`
`required=SUCCESS` perfil `critical`;
OpenCode declara **303 API PASS**, además de
focales H-SPEC04 y typecheck/build. Postmerge
GitHub run
[40837093511](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/40837093511)
`SUCCESS` perfil `fast` sobre
**`e3ebd76e09115469230766bb2f34f78eb39f1ea1`**,
que valida baseline/typecheck/build **sin volver
a ejecutar la suite API**. Playwright/E2E y
`full` continúan **UNRUN** en estos perfiles.
Álex comprobó diff, identidad de SHAs, estado PR,
archivos del commit y CI; no corrió los tests.

**Estado:** los **tres defectos confirmados
se consideran corregidos e integrados**,
pero **SPEC04 NO se cierra globalmente**:
AC futuros/DT5/E3.5 y E2E no quedan acreditados
por esta corrección. El tracker sigue en
`audit/spec04-25` y no forma parte del
squash #125. No se autoriza despliegue ni
modificación adicional del producto.
Los dictámenes anteriores OPEN/NO MERGE
se preservan abajo como **evidencia histórica
del estado previo**, no como estado vigente.

## Balance preliminar de cierre exploratorio — 2026-10-29 (criterio de parada)

**Base de evidencia:** `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`;
25 SPEC del inventario leídas al menos una vez, con segunda
inspección por riesgos y consumidores. **3 formalmente cerradas**
(SPEC01–03); **22 aún no cerradas** en la tabla individual,
incluidas SPEC17/20–22/26/27 que son principalmente
documentación aprobada o en revisión sin DEV. Esta evaluación
no ejecutó suite integral ni homologación financiera contra
Excel físico; parte de los escenarios de SPEC04/07/11 fueron
reproducidos exclusivamente por OpenCode en SQLite ficticia
efímera y contrastados estáticamente por Álex.

### Último contraste económico — SPEC12/13/14/21, sin nuevo fallo probado

- `flujo-mensual.ts:68-203,338-405`: el flujo base
  E2.6 consume ingresos bancarios y **Gasto bruto**
  registrado; deuda ordinaria es subconjunto del Gasto
  y amortización extraordinaria resta una sola vez.
  El Neto Compartido/recuperaciones aparece
  explícitamente **pendiente**, sin sumarse al
  Gasto ni inventar ahorro. Operativo de cobertura
  incompleta no se presenta como ahorro real.
- `anticipos.ts:333-545` calcula `Adelantado−Recuperado`
  de Transferencias con rol/par acreditado, informa
  por separado Transferencias relacionadas sin rol
  y protege fotos `Neto apertura` del Ciclo.
  La devolución no se suma a Ingreso ni se resta
  de Gasto por segunda vez.
- `compartidos.ts:180-316,915-1187` usa motor
  único para Bruto por Gastos CAT013, Recuperado
  acreditado de terceros y Neto de caso;
  atribuye Recuperado por Gasto en céntimos
  mediante reparto exacto; pendientes/excesos de
  terceros no se compensan para declarar cierre.
  Las aportaciones de terceros son Transferencias
  `S000→interno`, no Ingreso de Nómina u Otros.
- SPEC21 `§4.5` define para **futuro E3.6**
  `G_n=G_b−R_adj` y `S_aj=Ingresos−G_n−Extra`,
  por **sustitución** de Gasto bruto, nunca
  `G_b+Neto`. El Recuperado vivo puede
  redistribuirse con cambios posteriores: no
  presentar como cierre histórico ni implementado
  en E2.6.
- **Resultado:** coherencia conceptual en estas rutas,
  **sin incidencia nueva confirmada** ni cobertura
  dinámica nueva. No reabrir fórmulas ya acordadas
  por duplicación inferida.

### Registro consolidado de decisiones (la clasificación final prevalece sobre notas históricas)

| Prioridad | ID | Evidencia y estado | Siguiente acción separada |
| --- | --- | --- | --- |
| Alta · defecto operativo | **H-SPEC04-04** | CONFIRMADO por SQLite efímera: Movimiento puede confirmarse con fuente temporal Comida instalada en `error` | Guardar 409 `REFERENCE_ERROR` en preview/confirmación para todos los tipos relevantes, sin escrituras parciales; tests de alta/rectificación/anulación y control de fuente vacía |
| Media · cálculo temporal | **H-SPEC04-02** | CONFIRMADO: referencia `después` de un Movimiento retroactivo omite Comida posterior | Usar referencia central de todas las fuentes al calcular después; pruebas de backdate |
| Media · revalidación | **H-SPEC04-03** | CONFIRMADO: huella de Movimiento no cambia ante algunas operaciones Comida | Diseñar huella de impacto temporal/cobertura que invalide cambios materiales sin sobreinvalidación innecesaria |
| Media · atribución y UX | **H-SPEC07-01** | F1/F2 CONFIRMADOS como conducta: Comida reasignada no figura ni invalida preview; incumplimiento actual **PROVISIONAL** por AC28 futuro. F3 (fuente error) descartado | Decidir alcance AC28; aviso UX claro mínimo, o impacto/revalidación completa si se aprueba; no llamar «cero hechos» a solo cero Movimientos |
| Alta · gate de integración | **H-SPEC32-01** | CONFIRMADO por comparación de ramas: PR #30 sigue DRAFT con base v16 y matriz de rollback 16→16, frente a `main` v18 | No merge: reconciliar baseline y ampliar continuidad v17/18 y CI Linux/rootless; autorización para reanudar por separado |
| Media · diseño futuro | **H-SPEC26-01** | CONFIRMADA dependencia de firma: `positionsFor` E4.1 no admite fecha Fin; precierre/cierre aún no implementados | Antes de DEV26/27 definir posiciones históricas con motor único, incluidas futuras Ventas |
| Bajo · ambigüedad | **H-SPEC09-01** | NO bug demostrado: cero de Plan con Fin temporal y sin referencia financiera sigue contrato vigente | Mantener y diferenciar Fin temporal/cobertura; decidir si se exige otro oráculo |
| Bajo · ambigüedad | **H-SPEC11-01** | NO bug demostrado: media documental y pronóstico aplican elegibilidad distinta (pruebas N11-F1/F2/F3) | Conservar, decidir solo si se desea cambio funcional |
| Operativo · cobertura | **R-INV-01** | Riesgo permitido: rectificar Transferencia puede dejar efectivo del bróker negativo tras Compra; SPEC19 no exige veto global | No bloquear hechos bancarios reales por regla inventada; test futuro de presentación/auditoría |
| Documental | **H-TRANS-01 / H-SPEC05-01/06-01/20-01/21-01** | Estados históricos de documentos desactualizados, sin nuevo efecto monetario demostrado | Corregir vigencias en un lote documental separado, preservando historia y evidencia |

### Riesgos y pruebas pendientes que **no** justifican seguir explorando sin encargo nuevo

- **SPEC16 AC25:** equivalencia funcional/física con el Excel
  vigente, aún **sin verificar**. No sustituir con fixtures.
- **SPEC17/20/21/22/26/27:** aprobaciones y DEV
  diferenciados; AC UNRUN y dependencias E3.5,
  DT7, DT6/T-BKP, posiciones a Fin.
- **SPEC31/32:** durabilidad física/offsite, permisos
  del VPS, rollback real y restore externo no
  probados. Mantener gates antes de despliegue y
  cierre financiero; rootless CI previa no prueba
  Debian/VPS actual.
- **SPEC04/07:** para pasar de hallazgos a correcciones
  hay que aprobar oráculos, scope y PR; no convertir
  hipótesis previas o cambios futuros en bug confirmado.

**Criterio de parada propuesto:** detener ahora la
búsqueda exploratoria. Las tres incidencias
técnicas confirmadas de SPEC04, la UX/atribución
SPEC07 y los gates de integración 26/32 están
localizados, priorizados y respaldados por evidencia.
Las nuevas pasadas estáticas aportan rendimiento
decreciente. **No equivale a cerrar formalmente
las 22 SPEC**: falta revisar el informe final,
autorizar los lotes y ejecutar controles de regresión
y equivalencia que correspondan. Ningún desarrollo
ni merge se deriva automáticamente de este hito.

## Revisión independiente de PR #125 — fixes SPEC04 (2026-10-29)

**Entrega:** OpenCode relay #0018, PR [#125](https://github.com/jmartinlabs/myfinanzas-app/pull/125),
HEAD `af368fffd8eff91a56b75bafbead3fd6b898dc25`,
base `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`.
Dos archivos `apps/api/src/movimientos.ts` y
`apps/api/src/movimientos.test.ts`, **+291/−3**.
GitHub muestra PR OPEN, no draft, mergeable/clean,
sin merge. Run [40833602594](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/40833602594)
sobre HEAD exacto: `required=SUCCESS` (perfil critical,
OpenCode reporta **303 API PASS**). El perfil crítico no
ejecutó Playwright/E2E; Álex revisó diff y contratos,
**no ejecutó pruebas localmente**.

### Controles aceptables en candidato (inspección estática)

- **H-SPEC04-04:** `plan()` consulta
  `cycleContext(db).referencia.estado` y rechaza
  `error` con 409 `REFERENCE_ERROR` antes de
  escritura en alta/rectificación/anulación. `writeMovement`
  usa transacción `immediate` y `plan()` común;
  una respuesta previamente persistida sigue
  siendo idempotente. Prueba nueva de preview para
  los tres caminos, confirmación de **alta** con
  snapshot y ruta HTTP MFA/CSRF.
- **H-SPEC04-02:** máximo posterior se calcula con
  `financialReference` incluyendo Movimientos
  vigentes propuestos y `revisionComidaSource`.
  Las pruebas abarcan backdate, rectificación y
  anulación del máximo. No finge Inversión pendiente.
- **H-SPEC04-03:** el `fingerprint` local del preview
  incorpora la fuente Comida; no ensancha
  `financeRevision` global. La prueba nueva demuestra
  **409 si cambia máximo de Comida**, y estabilidad de
  huella al añadir un detalle anterior sin cambiar máximo.
  El resultado respeta el mecanismo de referencia
  financiera actual, no resuelve la cobertura
  atribuida a Ciclos en H-SPEC07-01/AC28.

### Dos puntos de revisión antes de recomendar merge (sin nueva autorización de alcance)

1. **Sobreinvalidación de huella:** el cambio incluye
   `comidaSource` completo `{state,maxDate}` en el
   fingerprint. Caso ficticio no ejecutado: Movimiento
   máximo 24/10, Comida máxima 20/10 y preview de
   Movimiento 15/10; añadir Comida 21/10 cambia
   `comidaSource.maxDate` pero **no altera**
   `referenciaAntes=referenciaDespues=24/10`,
   ni datos bancarios, saldos o ciclos de la propuesta.
   La implementación actual invalidaría el preview con
   `IMPACT_CHANGED`. Contradice el objetivo de
   evitar conflictos por cambios temporalmente
   irrelevantes en el mandato #0017; es un
   **coste UX de sobreinvalidez**, no una vía de
   escritura incorrecta. Pedir test de control negativo
   y ajustar solo fingerprint temporal a referencia/
   cobertura **efectivamente material** antes/después
   si se puede sin abrir una capa nueva.
   Mantener control positivo: si rectificar/anular el
   Movimiento máximo hace que el nuevo máximo de
   Comida sí determine el `referenciaDespues`,
   cambiarlo **debe** causar 409.
2. **Caminos de confirmación bajo error:** hay pruebas
   de preview de alta/rectificación/anulación, pero
   el test de `writeMovement` bajo error cubre solo
   **alta** con fingerprint ficticio y ruta HTTP alta.
   La guarda común está implementada, pero añadir
   confirmación **rectificación y anulación** con
   fingerprints obtenidos válidamente antes de
   romper la fuente, exigir `409 REFERENCE_ERROR`
   y constatar snapshot íntegro (Movimiento, auditorías,
   intentos, contador). El backend debe rechazar
   antes de consumir identidad o alterar relaciones.

**Condición de revisión:** no se declara error de dinero
nuevo ni se rechaza el diseño global. H-SPEC04-04/02/03
están atendidas en código, pero PR #125 **queda
pendiente de los dos oráculos focales** y de
la cobertura de aceptación final que corresponda
(E2E actualmente UNRUN). No modificar SPEC07,
E3.5, ningún esquema, Excel ni consumidores ajenos.
Sin autorización para merge/despliegue.

## Revisión final PR #125 — relay #0020, SPEC04 (2026-10-29)

**Base y artefactos:** recepción de [relay #0020](https://github.com/jmartinlabs/myfinanzas-app/blob/coord/spec-audit-relay/specs/investigations/spec-audit-relay.md),
PR [#125](https://github.com/jmartinlabs/myfinanzas-app/pull/125)
HEAD **`401bbff3f02c702b690e54afc9356d7af41f94ba`**,
base `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`.
PR sigue **OPEN**, `mergeable=true`, no draft;
cambia solo `apps/api/src/movimientos.ts` y
`apps/api/src/movimientos.test.ts` (+453/−3).
GitHub run [40835279386](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/40835279386)
ejecutado sobre exactamente `401bbff`:
`required` **SUCCESS**, perfil `critical`;
OpenCode declara **303 pruebas API PASS** y
5 focales H-SPEC04 PASS (36 expect), además de
typecheck/build PASS. Álex verificó el estado de
CI y **leyó todo el diff**, pero no reejecutó
las suites personalmente.

### R1 — ACEPTADO, salvo límites declarados

- Antes `comidaSource={state,maxDate}` entraba en
  huella y podía invalidar vista previa pese a que
  el máximo global no cambiaba. Ahora
  `movimientos.ts` incorpora en el fingerprint
  **`referenciaAntes/Despues` efectivas**
  `{fecha,estado}` tras agregar fuentes centrales;
  `financeRevision` global queda intacta.
- Test negativo nuevo: Movimiento 24/10, Comida
  20/10→21/10, preview de Gasto 15/10:
  referencia antes/después 24/10, huella
  idéntica y confirmación admitida.
- Test positivo nuevo: rectificación del Movimiento
  máximo 24/10→10/10, Comida 20/10→21/10:
  referencia después pasa 20/10→21/10,
  huella distinta y confirmación antigua
  rechazada. Fuente en `error` mantiene 409
  `REFERENCE_ERROR`.
- **Criterio:** cumple el objetivo de invalidación
  material de la **referencia temporal actual**.
  No es una integración plena de atribución de
  todos los detalles de Comida (SPEC07/AC28
  sigue pendiente); no se presenta como tal.

### R2 — ACEPTADO

- El diff añade **previews válidas anteriores
  al error** para rectificación y anulación;
  tras romper el lector de Comida en base
  ficticia, las llamadas a `writeMovement`
  con fingerprint/contextRevision previos
  reciben `409 REFERENCE_ERROR`.
- Tests HTTP reales con sesión MFA/CSRF
  verifican también `/rectificar` y `/anular`
  con código 409 y sin escritura; el
  `snapshot(db)` conservado comprueba
  Movimientos, historial, metadatos,
  contadores e intentos según fixture.
  La lógica de `plan()` compartido
  bloquea antes del consumo de ID.
- Comida vacía/no instalada continúa como
  estado legítimo y no se equipara a fallo.

### Veredicto y pendientes

**PR #125 APTA PARA SOLICITAR APROBACIÓN EXPRESA DE MERGE,
NO MERGED.** Los dos requisitos R1/R2 de la
comunicación #0019 están cubiertos en el
HEAD exacto que pasa CI Linux. El remedio
de H-SPEC04-04/02/03 es coherente con el
contrato vigente y está acotado al backend
y sus tests. No se observa nueva anomalía
material en el diff revisado.

**Limitación honesta:** `critical` no ejecuta
Playwright/E2E ni la suite `full`; siguen
**UNRUN sobre este HEAD**. OpenCode informa
3 fallos locales previos de `app.test.ts`
en macOS atribuidos a entorno, no un PASS
global nuevo. Para mayor confianza puede
pedirse `full/E2E` antes del merge, pero
el criterio de Álex no lo considera un
bloqueo técnico automático para este
cambio exclusivamente API con regresión
HTTP y CI Linux crítica en verde.

La reparación **no cierra formalmente
SPEC04** ni cubre todos los contratos
futuros de E3.5/DT5 o SPEC07. Tras
autorización humana y eventual merge,
comprobar `main` y actualizar tracker,
sin aprobar retroactivamente SPEC
o AC futuros. Sin autorización expresa,
no fusionar ni desplegar.

## Decisión funcional aprobada — SPEC07 opción B (2026-10-29)

**Decisión del usuario:** «sí la apruebo» a la **opción B**
de Álex para SPEC07: integrar Revisión Comida en la
**revisión temporal de impactos de Ciclos**.
Es **aprobación de alcance funcional**, no de cambio de
código, documentos de SPEC, PR o merge.
Base cotejada: `main` `e3ebd76e09115469230766bb2f34f78eb39f1ea1`.

**Qué se aprueba, sin inventar motor financiero nuevo:**

1. La vista previa de `operationPlan` distingue los
   Movimientos y las operaciones de Revisión Comida
   realmente afectadas por el cambio de Inicio/intervalos,
   con ID, fecha, tipo, estado de registro,
   Ciclo antes/después y totales **separados**.
   No sumar importes de detalle de Comida con Gastos
   de Movimientos ni decir «sin hechos afectados»
   por contar solo Movimientos.
2. La confirmación relee ambas fuentes **dentro de
   transacción**; añadir/rectificar/anular una
   operación Comida que cambia atribución o impacto
   revisado invalida la huella aunque `MAX(fecha)`
   permanezca igual. Conservar el control de
   fuente instalada en `error` → `409 REFERENCE_ERROR`;
   estado sin instalar/vacía no se inventa como fallo.
   Preservar guardas preexistentes de fotos de
   Anticipos, vecinos, revisión, auditoría,
   idempotencia y rollback.
3. Reutilizar `revisionComidaRows()`, `deriveCycles()`
   y los consumidores existentes. La solución
   debe proponer manejo conservador de
   estado `Vigente/Anulado` y detalle paginado
   sin cortar la huella ni conteo por página,
   preservando compatibilidad de la API previa.
   Reducir invalidaciones no materiales sin
   dejar cambios de atribución ocultos.

**Fuera de alcance:** E3.5/conciliación y cierre
de comida, cálculos de recursos, préstamos,
Presupuestos, inversión como fuente aún pendiente,
Cierre/DT5, cambios reales de Movimientos,
IDs/importes/fechas bancarias, Excel, migraciones
SQLite o reescritura de SPEC07 sin autorización.

**Criterios de prueba que deberá detallar OpenCode
antes de cualquier desarrollo:**
- Comida del 03/10 con máximo existente 20/10,
  Inicio de Ciclo 01/10→05/10: reportar
  Comida afectada aunque Movimientos afectados
  sean 0; inserción entre preview/confirmación
  produce `409 CONTEXT_CHANGED`.
- Control negativo: cambio ajeno a fechas y
  atribuciones revisadas no invalida por
  mero cambio de máximo/registro; decidir
  exactamente el significado de «material»
  sin suponerlo.
- Estados Vigente/Anulado y operaciones
  Detalle/Reposición, páginas 1 y 2,
  ciclos adyacentes, Comida vacía/fuente rota,
  usuario con idempotencia repetida,
  concurrencia y transacción sin escritura
  parcial; protección de Neto apertura.
- Señalar en UI que el máximo de referencia
  no certifica la conciliación económica.

**Acción autorizada ahora:** elaborar y remitir
**propuesta técnica read-only** con archivos,
consumidores y criterios de aceptación,
sin código/PR ni merge. La implementación requerirá
autorización expresa posterior del usuario.
No reclasificar por ello AC28 futuro como
PASSED ni dar SPEC07 por cerrada.

**Actualización de transporte (postdecisión, 2026-10-29):**
`main` avanzó a `f69d7d250f0a9440da7e41227233e7c3dcdd5580`
por squash PR #126, que **no tocó SPEC07 ni su código**,
pero implantó **Agent Relay v1** como único canal
vigente y descartó el relay manual paralelo. El
mensaje #0024 de diseño read-only **sí se publicó
y verificó en la rama histórica**
`coord/spec-audit-relay` (commit `fa6bc562`),
pero esa publicación no equivale al nuevo
transporte ni acredita que OpenCode lo haya
recibido. No continuar con el relay heredado;
para nuevas comunicaciones se necesita una
conversación Agent Relay v1 inicializada en
`relay/<id>` mediante el script de su Skill
y su ID real, sin inventarlo ni crear canal
paralelo. Hasta entonces, decisión registrada
y coordinación de la propuesta pendiente.
No da autorización de desarrollo.

## Reglas de la auditoría

- **Auditoría global previa a correcciones:** Álex revisa las 22 SPEC pendientes del
  inventario en rondas de 3–5 SPEC afines, contrasta reglas con implementación/pruebas
  y dependencias transversales, y registra aquí sus propios hallazgos con evidencia.
  Se conserva el estado **individual** de cada SPEC; «Revisada» no equivale a «Cerrada».
- OpenCode investiga las cuestiones que Álex remita por relay, pero **no altera los
  hallazgos de Álex durante la inspección**. Tras terminar la auditoría global,
  propone lotes de corrección; ejecuta solo lo autorizado por el usuario, prueba y
  publica PR, con validación final de Álex y autorización humana del merge.
- **Ningún merge sin autorización expresa** del usuario.
- No se reabren decisiones financieras aprobadas sin contradicción demostrada.
- No se elimina ni archiva ningún archivo automáticamente.
- Consolidar hallazgos y correcciones compatibles en el menor número razonable de PR;
  separar cambios críticos por dependencias/riesgos. Evitar PR de cierre auxiliares.
- Este registro no duplica el estado funcional general de [epic-board](../epic-board.md).

### Coordinación Álex ↔ OpenCode durante la auditoría global (2026-10-28)

- Base inicial: `main` `5570d89` (SPEC01–03 cerradas). Los hallazgos nuevos se
  guardan en **esta rama de auditoría**, `audit/spec04-25`, no directamente en `main`.
- El **único** mensaje de coordinación vigente está en
  `specs/investigations/spec-audit-relay.md` de la rama
  **`coord/spec-audit-relay`**. Se reemplaza, con contador `0001`, `0002`…,
  remitente/destinatario y comprobación de blob SHA; el historial Git conserva
  mensajes anteriores. No crear PR ni ejecutar CI por cada mensaje.
- Cada agente resume al usuario qué ha recibido/respondido y, tras confirmar la
  escritura remota, comunica «Listo - XXXX». Al recibir «Lee XXXX», verifica
  número y destinatario exactos. Si hay desajuste, no responde ni sobrescribe.
- Solo Álex escribe los hallazgos de esta ronda; OpenCode trabaja en paralelo solo
  sobre tareas expresamente autorizadas y no debe sobrescribir este tracker.
- Una PR consolidada integrará el tracker en `main` tras revisión y autorización;
  el relay permanece en su rama y **no** se incorpora a la PR ni a `main`.

### Regla obligatoria de coherencia con el código (2026-10-28)

La auditoría verifica también la coherencia entre las reglas documentadas y el desarrollo
real de `main`:

1. Identificar las reglas funcionales y financieras vigentes.
2. Comprobar qué componentes, servicios, cálculos y pruebas las implementan o consumen.
3. Contrastar documentación y comportamiento real, distinguiendo:
   - SPEC incorrecta y código correcto.
   - SPEC correcta y código incorrecto.
   - SPEC y código coincidentes, pero regla financiera potencialmente incorrecta.
   - Regla correcta, pero sin implementación o pruebas suficientes.
4. Si hay discrepancia, identificar archivos, evidencia, impacto financiero, consumidores
   y regresiones necesarias.
5. **No modificar reglas financieras para ajustarlas al código.** Respetar la jerarquía
   de autoridad y contrastar con Criterios y Excel vigente cuando corresponda.
6. **No corregir código automáticamente.** Presentar primero el diagnóstico y la
   propuesta a Álex y al usuario. Cualquier cambio funcional requiere autorización
   específica y una PR separada o un alcance expresamente aprobado.
7. Registrar los hallazgos en este fichero, con impacto sobre código, pruebas y
   consumidores.

**Criterio de cierre:** una SPEC no se considera completamente auditada mientras conserve
una contradicción material no resuelta con la implementación. Las dependencias futuras
correctamente delimitadas no exigen desarrollar funcionalidades no autorizadas.

## Inventario verificado contra `main` `63ee1d0`

Leyenda: **S** specification, **T** testplan, **P** progress, **B** brainstorming.

| SPEC | Funcionalidad | S/T/P/B | Observaciones |
| --- | --- | --- | --- |
| 01 | Saldos y atributos de control | Y/Y/Y/Y | — |
| 02 | Clasificación | Y/Y/Y/Y | — |
| 03 | Ciclos financiados | Y/Y/Y/Y | — |
| 04 | Movimientos | Y/Y/Y/Y | — |
| 05 | Transferencias y Referencias | Y/Y/Y/Y | — |
| 06 | Deuda | Y/Y/Y/Y | — |
| 07 | Operación de Ciclos | Y/Y/Y/Y | — |
| 08 | Presupuestos | Y/Y/Y/Y | — |
| 09 | Plan del ciclo | Y/Y/Y/Y | — |
| 10 | Plan anual | Y/Y/Y/Y | — |
| 11 | Nómina y previsión | Y/Y/Y/Y | — |
| 12 | Flujo mensual | Y/Y/Y/Y | — |
| 13 | Anticipos | Y/Y/Y/Y | — |
| 14 | Gastos compartidos | Y/Y/Y/Y | — |
| 15 | Vehículos e ITV | Y/Y/Y/Y | — |
| 16 | Revisión Comida | Y/Y/Y/Y | — |
| 17 | Deuda completa | Y/Y/N/Y | Sin `progress` |
| 19 | Instrumentos y Compras de inversión | Y/Y/Y/Y | — |
| 20 | Histórico precontrol | Y/Y/Y/Y | — |
| 21 | Pendientes y conciliación | Y/Y/Y/Y | — |
| 22 | Ventas y posición de bróker | Y/Y/Y/Y | Incluye wireframes y capturas |
| 26 | Precierre | Y/Y/N/Y | Sin `progress` |
| 27 | Cierre financiero | Y/Y/N/Y | Sin `progress` |
| 31 | SQLite producción | Y/Y/Y/Y | Incluye `enmienda-01` |
| 32 | Ejecución rootless | Y/N/N/Y | Sin `testplan` ni `progress` |

### Ausencias y límites del inventario

- **SPEC18** no existe en `main`; solo en la rama de DEV18/E3.5. No forma parte de las 25
  autorizadas; no se audita sin decisión expresa.
- No existen SPEC23–25 ni SPEC28–30. La numeración original se conserva; no se renumera.
- Las ausencias de `progress`/`testplan` se registran como hallazgo documental; no se
  crean archivos por inferencia durante la auditoría.

## Estados

`Pendiente` · `Revisada por Álex` · `Corrección en curso` · `PR pendiente` · `Validada` ·
`Cerrada`.

## Registro por SPEC

| SPEC | Funcionalidad | Estado | Hallazgos y correcciones | Archivos afectados | Conservación/archivo | PR / HEAD / CI | Validación y merge | Riesgos |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | Saldos y atributos de control | Cerrada | Correcciones aplicadas; **H-SPEC01-01 resuelto** (null = 0 neutral solo en cálculo); **tabla AC-01…AC-43 consecutiva** con nota fuera; PR #115 integrada. | 4 docs SPEC01 + tracker | Conservar todo; sin eliminaciones; posibles simplificaciones históricas futuras con justificación. | [#115](https://github.com/jmartinlabs/myfinanzas-app/pull/115) / merge `e4a26de` / CI `40728150624` PASS | 2026-10-28 · Álex APROBADA · merge autorizado | AC-38 parcial y E1.3 no acreditado; gap cero explícito + movimientos no bloqueante. |
| 02 | Clasificación | Cerrada | D1 estados históricos; D2 AC-19/24/25/26 sin reclasificar; D3 rectificación y Partida→Deuda; D4 cobertura real; **H-SPEC02-01 resuelto e integrado** (checked/partial/pending/notApplicable, sin ciclos parcial, planes anuales y mensajes). Cierre efectivo al integrar esta PR. | 4 docs SPEC02 + tracker + `clasificacion.ts`, `movement-impact.ts`, `Clasificacion.tsx`, `PlanImpact.tsx`, tests unit/E2E | Conservar todo; sin eliminaciones. | #117 doc `13cc7c6`; #119 funcional `da93682`; HEAD validado `6440592`; CI `40747193480` PR / `40747195074` full / `40748880562` main PASS | 2026-10-28 · Álex APROBADA · merge autorizado | Sin contradicciones materiales abiertas. |
| 03 | Ciclos financiados | Cerrada | H-SPEC03-01/02/03 **resueltos e integrados**; 24 AC históricos conservados; AC-11/23/24 siguen C. | 4 docs SPEC03, `movement-ledger.ts`, `ciclos.test.ts`, tracker | Conservar todo; sin eliminaciones. | [#122](https://github.com/jmartinlabs/myfinanzas-app/pull/122) / HEAD validado `7483709` / merge `52eaec0` / CI `40760689632` critical (298 API) y `40761769656` main fast PASS | 2026-10-28 · Álex APROBADA (HEAD `7483709`) · merge autorizado e integrado | `monthlyFlow()` y rutas con `ledgerRows()` directo pueden seguir fallando; cobertura no ampliada. |
| 04 | Movimientos | Tres correcciones integradas en `main`, sin cierre formal de SPEC04 | H-SPEC04-04/02/03: PR #125 MERGED por squash `e3ebd76`; R1 huella de referencia agregada y R2 guardas de confirmación histórica validadas previamente en HEAD `401bbff`; CI critical 303 API PASS en ese HEAD, postmerge fast PASS sobre `e3ebd76`. | GitHub PR #125, diff squash de 2 archivos, CI `40835279386` y postmerge `40837093511`, relay #0022, SPEC04 testplan. | Mantener SPEC04 formalmente abierta (AC y contratos futuros); E2E/full UNRUN sobre candidato/merge, no declarar validación global; ninguna acción nueva de código sin aprobación. | `main` `e3ebd76e09115469230766bb2f34f78eb39f1ea1`, PR #125 CLOSED/MERGED, HEAD previo `401bbff`. | 2026-10-29 · verificación GitHub posterior al squash por Álex; suites de tests no reejecutadas por Álex. | Tres defectos solucionados en `main`; no equivale a cierre financiero ni a SPEC04 completa; sin despliegue autorizado. |
| 05 | Transferencias y Referencias | En inspección (no cerrada) | H-SPEC05-01 documental: vigencia de excepción D5/Exterior desfasada respecto a integración #90; AC futuros no reclasificados. | Spec05 §D5 y sección Transferencias; progreso D5 spec14 y código `aportaciones.ts`. | Conservar historia y aprobaciones. | PR #84 `2487656` y #90 `cf6954a` MERGED; contraste en `main` `5570d89`. | 2026-10-28 · inspección Álex, sin cierre. | Bajo/medio: ambigüedad de capacidad actual; sin fallo económico demostrado. |
| 06 | Deuda | En inspección (no cerrada) | H-SPEC06-01 documental preliminar: cabecera y plan histórico de dev expresan no integrado pese a PR #34 fusionada; falta auditoría técnica completa. | SPEC06, `deudas.ts`, `movimientos.ts` y tests de Deuda. | Conservar historial y límites. | PR #34 `cb9ba3b` MERGED, contrastada. | 2026-10-28 · lectura de contrato/servicios, sin cierre. | Estado documental obsoleto; no se demuestra fallo económico en esta pasada. |
| 07 | Operación de Ciclos | **En inspección (no cerrada); opción B integrada en `main`** | H-SPEC07-01: F1/F2 confirmaron la omisión previa de Revisión Comida en preview/huella; la opción B integra impacto temporal y revalidación de Comida separando vigentes e históricas. **B1/B2/T1 corregidos e integrados** (periodo completo con mismo ID, paginación por máximo de totales y error exclusivo del lector con 409). F3 de la reproducción inicial fue descartado; no atribuir conciliación ni cerrar AC28 global. | SPEC07 Q1/AC07/17/28; `apps/api/src/app.ts`, `ciclos.ts`, `cycle-operations.test.ts`, `cycle-pagination.test.ts`; `apps/web/src/Ciclos.tsx`, `cycle-pagination.ts`; `tests/e2e/cycle-operations.ts`; documentación SPEC07; evidencias en rama separada `evidence/spec07-qa-20261029`. | Conservar histórico y rama de evidencias sin borrarla sin autorización. Alcance integrado solo impacto temporal; AC28/E3.5/inversión/conciliación/cierre siguen fuera. No se realizó despliegue. | [PR #128](https://github.com/jmartinlabs/myfinanzas-app/pull/128) MERGED por squash `2c97a66a111ee13dc5709e0a27b1032d8fe86dc8`; HEAD validado `b1e1149c7a9ded643055afe4242486af0c4fb1bd`; [CI premerge `40871067484`](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/40871067484) critical PASS (311 API); [CI postmerge `40872519671`](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/40872519671) fast PASS en `main` `2c97a66`. | 2026-10-29 · Álex: dictamen favorable tras revisión B1/B2/T1, QA publicado y 4 capturas 390/1440 inspeccionadas con SHA-256 **4/4 coincidentes**. El usuario autorizó el merge; integración y CI postmerge verificados. Dos E2E focales PASS **reportadas**, no reproducidas por Álex. | **SPEC07 no cerrada globalmente**: AC28/E3.5, inversión, conciliación y cierre PENDING. E2E global no completada satisfactoriamente por fallo ambiental; no PASS global. No se conservaron logs crudos de Playwright ni tests focales efímeros. CI postmerge fast no equivale a ejecución API completa. |
| 08 | Presupuestos | En inspección (no cerrada) | H-TRANS-01: vigencia documental desactualizada tras merge funcional; coherencia transversal en evaluación. | `specs/08-*` y consumidores API. | Conservar histórica; nota de estado actual, sin reescribir evidencia. | PR #44 MERGED `255bf61` (verificado). | 2026-10-28 · ronda documental + contraste parcial Álex; sin cierre. | Documental menor; contratos futuros/test gates requieren verificación específica. |
| 09 | Plan del ciclo | En inspección (no cerrada) | H-TRANS-01 documental; H-SPEC09-01 reclasificado como ambigüedad funcional, NO defecto técnico confirmado: Fin temporal deriva 0 conforme a P12/AC17; Fin futuro aún discutible. | `planes-ciclo.ts`, `ciclos.ts`, SPEC09 AC17, P12, relay #0007. | No cambiar motor ni prueba; documentar decisión explícita solo si usuario quiere otra semántica. | PR #57 MERGED; main `1ed2a83`; OpenCode reprodujo caso. | 2026-10-28 · contraste independiente #0007, sin cierre. | Bajo de cálculo confirmado; riesgo de interpretación de cero como ejecución definitiva. |
| 10 | Plan anual | En inspección (no cerrada) | H-TRANS-01: vigencia documental desactualizada tras merge funcional; coherencia transversal en evaluación. | `specs/10-*` y consumidores API. | Conservar histórica; nota de estado actual, sin reescribir evidencia. | PR #61 MERGED `e1d6dba` (verificado). | 2026-10-28 · ronda documental + contraste parcial Álex; sin cierre. | Documental menor; contratos futuros/test gates requieren verificación específica. |
| 11 | Nómina y previsión | En inspección (no cerrada) | H-SPEC11-01 reclasificado: NO BUG demostrado; diferencia de elegibilidad media documental vs pronóstico reproducida en #0012 y coherente con separación de fuentes. Ambigüedad futura: admitir documento completo sin banco o discrepancia resuelta para pronóstico. | SPEC11 Q5/pronóstico, `nomina.ts`, `nomina-mensual.ts`, pruebas ficticias OpenCode #0012. | Mantener comportamiento y tests actuales; cambio de semántica solo con decisión expresa. | PR #63 integrada; `main` `1ed2a83`, relay #0012 contrastado. | 2026-10-28 · F1–F3 ejecutados por OpenCode en memoria; Álex contrasta evidencia estática, sin cierre integral. | Bajo de cálculo; UX/expectativa de elegibilidad documental, sin modificación bancaria. |
| 12 | Flujo mensual | En inspección (no cerrada) | Sin hallazgo nuevo en primera lectura; ejecución bancaria y amortización separadas; AC14/16/17/19/26/43/47 con cobertura parcial/UNRUN reconocidos. | SPEC 12, servicios API y matrices de aceptación. | Conservar historial y límites. | PR #67 `a445f90` integrada. | 2026-10-28 · contraste documental/código parcial; sin cierre. | Validación integrada y cobertura transversal aún por comprobar. |
| 13 | Anticipos | En inspección (no cerrada) | H-TRANS-01 (ampliación): progress deja PR #71 DRAFT y QA pendiente pese a integración; motor rol/par cotejado parcialmente. | SPEC 13, servicios API y matrices de aceptación. | Conservar historial y límites. | PR #71 `b146eda` integrada. | 2026-10-28 · contraste documental/código parcial; sin cierre. | Validación integrada y cobertura transversal aún por comprobar. |
| 14 | Gastos compartidos | En inspección (no cerrada) | H-TRANS-01 (ampliación): checkpoint D5 conserva PR #90 Draft/no merge; Base B y D5 ya integradas, B-T11 todavía futuro. | SPEC 14, servicios API y matrices de aceptación. | Conservar historial y límites. | PR #75 `5ad75ed`; #90 `cf6954a` integradas. | 2026-10-28 · contraste documental/código parcial; sin cierre. | Validación integrada y cobertura transversal aún por comprobar. |
| 15 | Vehículos e ITV | En inspección (no cerrada) | H-TRANS-01: progreso y testplan anteriores a PR #81 fusionada; compatibilidad anual E2.4 examinada parcialmente. | SPEC15 y `vehiculos.ts`/tests. | Documentos históricos conservados; límites anuales pendientes de contraste exhaustivo. | PR #81 MERGED `f5bf032`. | 2026-10-28 · inspección documental/código. | Cobertura histórica sin proveedor; no declarar total anual completo por ausencia de hechos. |
| 16 | Revisión Comida | En inspección (no cerrada) | H-TRANS-01: progreso mantiene PR #82 abierta/no merge; fuente temporal central presente, sin duplicar Movimientos. | SPEC16, `revision-comida.ts`, `revision-comida-ledger.ts` y pruebas. | Conservar historial sin equiparar fixtures al Excel. | PR #82 MERGED `26b6f0c`. | 2026-10-28 · inspección documental/código. | AC-25 (equivalencia física) abierto; E3.5 futuro. |
| 17 | Deuda completa | Revisada parcialmente (no cerrada) | Sin `progress` coherente con fase de diseño; specification/wireframes no aprobados, 0 pruebas funcionales ejecutadas. No hallazgo funcional por falta de desarrollo. | SPEC17, brainstorming y testplan; Deuda E1.6 como dependencia. | No crear progress innecesario hasta autorización/desarrollo. | Sin DEV17 ni PR funcional acreditada. | 2026-10-28 · revisión de gate documental; sin aprobación de SPEC17. | D1–D7 confirmadas, contrato completo pendiente; mantener UNRUN. |
| 19 | Instrumentos y Compras de inversión | En inspección (no cerrada) | H-TRANS-01: specification/testplan conservan PR #95 draft/no merge; progreso reconoce integración y seis AC PARCIAL. | SPEC19, `instrumentos.ts`, `ciclos.ts` y fuentes de inversión. | Distinguir evidencia histórica, integración y E4.2 pendiente. | PR #95 MERGED `156a50d`. | 2026-10-28 · documental/código parcial; sin cierre. | AC03/24/27/30/33/34 PARCIAL; fuente temporal inversión fuera de E4.1. |
| 20 | Histórico precontrol | En inspección (no cerrada) | H-SPEC20-01 documental: testplan aprobado en cabecera pero cierre final dice spec/wireframes no aprobados; desarrollo no autorizado. | SPEC20 specification/progress/testplan, roadmap E4.5. | Mantener 59 AC UNRUN; no preparar implementación por inferencia. | PR #87 documental MERGED `3d70fd6`. | 2026-10-28 · contraste documental y gate; sin cierre. | DT7 independiente; QA documental de AC48–59 pendiente. |
| 21 | Pendientes y conciliación | En inspección (no cerrada) | H-SPEC21-01 documental: cierre de testplan dice aprobación no concedida pese a cabecera aprobada; progreso #97 sin merge ya desactualizado. | SPEC21 specification/testplan/progress, dependencias E3.5/E4. | Mantener AC nuevos UNRUN; no afirmar integración funcional. | PR #97 documental MERGED `2364d9c`. | 2026-10-28 · contraste documental y gates; sin cierre. | DEV21 no autorizado; 31 AC UNRUN; E3.5 pendiente. |
| 22 | Ventas y posición de bróker | En inspección (no cerrada) | Contrato documental aprobado con 45 AC UNRUN; no hay defecto por ausencia de DEV22. Enmienda D7 de SPEC19 pendiente. | SPEC22 specification/progress/testplan/wireframes. | Conservar D7 como gate, no iniciar DEV22. | PR #105 documental MERGED `7073864`. | 2026-10-28 · revisión del gate; sin cierre. | Dependencia temporal E4.2-AC3 y guard de cantidad vendida aún no implementados. |
| 26 | Precierre | En inspección (no cerrada) | H-SPEC26-01: falta consulta temporal `positionsFor(...,fin)` en E4.1, dependencia de integración futura, NO bug de código vigente; 16 AC UNRUN. | SPEC26 §Inversión a Fin, SPEC27 y `investment-engine.ts`. | Resolver posición a Fin desde motor único antes de DEV26, sin duplicar lógica ni crear foto. | Sin DEV26; SPEC aprobada documentalmente. | 2026-10-29 · revisión estática de firma y contratos; UNRUN. | Riesgo medio de inconsistencia entre efectivo a corte y unidades actuales si se reutiliza motor sin fecha. |
| 27 | Cierre financiero | En inspección (no cerrada) | Dependencia H-SPEC26-01: la fotografía exige posiciones a Fin, aún no disponibles en E4.1; sin implementación ni AC ejecutados. | SPEC27 §Photo contract, T1/T2/T3, SPEC26 y `investment-engine.ts`. | Antes de DEV27: posición histórica verificable, E3.5/FIN_NETA, evidencia DT6/T-BKP; prohibido cierre parcial. | Sin DEV27; SPEC aprobada documentalmente. | 2026-10-29 · segunda inspección estática; UNRUN. | Riesgo de foto inconsistente si se combina cash a Fin con posiciones actuales; bloqueo externo/Comida vigente. |
| 31 | SQLite producción | En inspección (no cerrada) | H-TRANS-01: cabecera specification mantiene implementación pendiente pese a PR #25 y #48 integradas; enmienda 31-E1 aprobada, riesgo R6 histórico no resuelto. | SPEC31, `database-identity.ts`, `private-state.ts`, backup, tests. | Corregir solo vigencia documental tras QA. | PR #25 MERGED `511fcba`; PR #48 MERGED `8fae7a4`. | 2026-10-28 · integración contrastada; sin auditoría de seguridad completa. | Runtime Linux específico y soporte fsync/WAL requieren pruebas operativas antes de despliegue. |
| 32 | Ejecución rootless | En inspección (no cerrada) | H-SPEC32-01: candidata PR #30 basada en v16 mientras `main` es v18; matriz AC-18/rollback y snapshot v7–v16 no cubren nuevas tablas v17/v18. AC-18 y AC-22 pendientes para candidato actual, no bug en `main`. | PR #30 `24ca206`, `database-identity.ts` ambas ramas, `release-fixture.mjs`, testplan/progress32 y specs31/32. | Actualizar/reconciliar rama y ampliar fixtures/contratos y CI Linux/rootless para v18 antes de recomendar merge; respetar pausa/no PR. | PR #29 MERGED; #30 OPEN DRAFT head `24ca206`, base histórica `26b6f0c` (esquema16); `main` `1ed2a83` (esquema18). | 2026-10-29 · comparación directa de GitHub y contratos; sin ejecutar ni modificar producto. | Alta de aceptación/compatibilidad del release; no afirmar degradación automática de esquema al fusionar ni despliegue. |

## Auditoría global — primera pasada del lote A (SPEC04–06), 2026-10-28

**Base de lectura:** `main` `5570d89628480c0be2c575680993951240de2469`.
Durante la inspección `main` avanzó a `1ed2a83` con un único cambio de
`scripts/test-validator`; según `compare_commits`, ninguno de los módulos SPEC04–06
revisados cambió. Se mantiene la base fija para la trazabilidad.
**Alcance ya comprobado:** cabeceras, aprobaciones, notas de integración, servicios
Movimientos/Deuda, contrato central de fecha, fuente Comida, UI y pruebas asociadas.
**No equivale a la revisión integral** de contratos, rutas y regresiones; las tres
SPEC conservan estado en inspección hasta terminar sus rondas.
No se ha auditado la base Excel física en esta pasada.

### H-SPEC04-01 — Estado documental de fase anterior (documental, menor, provisional)

- **Evidencia:** `specs/04-movimientos-specification.md:347-354` aún indica
  «integrar PR #14 y esperar autorización de dev 04»; el `brainstorming:6` repite
  la siguiente acción de esa fase. Sin embargo, `04-movimientos-progress.md:1-16,41-51`
  y `04-movimientos-testplan.md:3-5` declaran E1.4 integrada, y la PR #15 figura
  **MERGED** en GitHub (`b51b89b`). Implementación real presente en
  `apps/api/src/movimientos.ts` con pruebas en `movimientos.test.ts`.
- **Diagnóstico:** instrucciones históricas potencialmente interpretables como
  estado actual; no se denuncia el contrato financiero ni se reabre la aprobación.
- **Propuesta:** en una futura corrección documental consolidada, añadir una breve
  nota de vigencia que remita al progreso actual; conservar el relato original.
  **Sin autorización ni propuesta de PR separada** por este motivo menor.

### H-SPEC04-02 — Referencia «después» no integra todas las fuentes (técnico, medio; reproducción pendiente)

- **Contrato y fuente central:** `apps/api/src/ciclos.ts:47-75,159-164` agrega máximos de
  `movementSource(db)` y `revisionComidaSource(db)` (la fuente de inversión aún
  pendiente); la cabecera financiera debe usar esa única referencia.
- **Implementación discordante:** `apps/api/src/movimientos.ts:753-756,804-805` calcula
  `referenciaAntes` con `cycleContext(db).referencia.fecha` (agregado real), pero
  `referenciaDespues` mediante `dates.sort().at(-1)` donde `dates` solo contiene
  fechas de Movimientos, excluido el hecho antiguo y aplicada la modificación.
  Omite fechas vigentes de Revisión Comida y el estado de error de fuentes.
  `apps/web/src/Movimientos.tsx:899-908` muestra ambas fechas como «Referencia
  financiera» antes/después.
- **Impacto potencial:** si el hecho más reciente es de Revisión Comida, el preview
  puede anunciar un retroceso inexistente; si una fuente está en error, puede
  mostrar una fecha aparentemente disponible. No se ha probado un cambio del
  motor central ni de los saldos: el defecto se limita a **la simulación del impacto**.
- **Prueba focal pendiente:** crear fixture con movimiento anterior y fecha vigente de
  Revisión Comida posterior; simular anulación/rectificación de Movimiento y
  comparar referencia posterior esperada con agregado central recalculado.
  Añadir variante de fuente `error` para definir presentación sin falsa precisión.
- **Corrección a evaluar después:** reutilizar la lógica central de fuentes en la
  simulación, evitando modificar tablas, duplicar algoritmos o alterar el contexto
  persistido. Ninguna implementación autorizada todavía.

### H-SPEC05-01 — Estado D5/Exterior anterior a integración (documental, menor)

- **Evidencia:** `specs/05-transferencias-referencias-specification.md:3-10` registra
  aprobación documental de D5 pero no integración; `:49-54` aún indica «D5
  propuesta (no vigente)» y `:355-421` conserva «NO APROBADA», con aclaración
  histórica en su cabecera. GitHub confirma PR documental #84 **MERGED** como
  `2487656` y PR funcional D5 #90 **MERGED** como `cf6954a`; el código vigente
  contiene `apps/api/src/aportaciones.ts` y la variante acotada S000→interno en
  `apps/api/src/movimientos.ts:145-225`. El progreso de spec14 conserva un
  checkpoint anterior de PR #90 en Draft.
- **Diagnóstico:** no se identifica contradicción financiera en las reglas D5.
  El texto de propuesta se explica como histórico, pero **no se expone claramente el
  estado de integración actual**, lo que puede llevar a interpretar incorrectamente
  la disponibilidad de la variante. E1.5 AC-31 sigue parcialmente futuro:
  la integración D5 no habilita Exterior ordinario, cierre ni todas sus variantes.
- **Propuesta futura:** nota única de vigencia que diferencie D5 documentalmente
  aprobada, implementada e integrada, de gates E3.2/B-T11 aún abiertos, sin
  reescribir la propuesta histórica ni convertir sus AC futuros en PASS.

### H-SPEC06-01 — Estado de desarrollo desactualizado (documental, menor, provisional)

- **Evidencia:** `specs/06-deuda-progress.md:2-12` inicia con «IN PROGRESS» y
  pendientes de validación; la misma ficha, `:45-50`, documenta integración
  posterior de PR #34. GitHub confirma **MERGED** (`cb9ba3b`); código y pruebas
  en `apps/api/src/deudas.ts` y `deudas.test.ts`.
  `06-deuda-specification.md:423-447` mantiene un plan «dev no iniciado» de
  etapa histórica.
- **Diagnóstico:** discrepancia de vigencia documental, no demostración de fallo
  funcional. La integración final está reconocida al pie de progreso.
- **Propuesta:** nota mínima sobre estado actual y carácter histórico del plan,
  sin borrar evidencias ni afirmar cobertura de consumidores futuros.

**SPEC05:** la lectura posterior de estado actual de PR #90 y servicios D5 ha
permitido registrar H-SPEC05-01 por **vigencia documental**, no por el contenido
histórico expresamente sustituido ni por una supuesta autorización de Exterior ordinario.

**Siguiente ronda:** recorrer guardas, cálculos, efectos de rectificación, migraciones,
pruebas y dependencias de SPEC04–06; después comprobar hallazgos y gravedad.
No iniciar correcciones ni declarar ninguna de estas SPEC cerrada.

## Auditoría global — segunda pasada del lote B (SPEC07–10), 2026-10-28

**Base de lectura:** `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`.
Se comprobaron documentos `specification`, `progress`, `testplan` de 07–10;
las PR de entrega funcional y los servicios de Ciclos, Presupuestos, Plan del ciclo
y Plan anual. **No hubo ejecución de pruebas nuevas ni revisión del Excel real**.
Esta ronda NO cierra ninguna SPEC.

### H-TRANS-01 — Progresos de varias SPEC sin estado de integración vigente (documental, bajo)

Hallazgo **transversal único** para evitar hallazgos repetidos de la misma
naturaleza; inicialmente observado en SPEC07–10 y ampliado a SPEC13–16, SPEC19
 y SPEC31.
La relación con cada SPEC se conserva en su fila de seguimiento.

| SPEC | Evidencia documental que permanece | Integración verificada en GitHub |
| --- | --- | --- |
| 07 | `07-ciclos-operacion-specification.md:2`, `progress.md:3-15` y `testplan.md:3-5` aún sitúan dev07/PR #49 fuera de `main` | PR #49 MERGED, squash `1cdbc7c` |
| 08 | `08-presupuestos-progress.md:3-5`: candidato y PR pendiente; la propia `specification.md:3` ya reconoce #44 integrada | PR #44 MERGED, squash `255bf61` |
| 09 | `09-plan-ciclo-progress.md:3-5,69-86`: «EN CURSO», CI y validación global pendientes | PR #57 MERGED, squash `7422d23` |
| 10 | `10-plan-anual-progress.md:3-7,90-100`: candidato y gate Linux/merge pendientes; `testplan.md:117-132` remite a CI por SHA | PR #61 MERGED, squash `e1d6dba` |
| 13 | `13-anticipos-progress.md:4-15`: PR #71 todavía Draft, candidato y gate de aceptación en curso pese a que el primer párrafo se declara vigente; el resto es historia conservada | PR #71 MERGED, squash `b146eda` |
| 14 | `14-compartidos-progress.md:8-32,282-375`: «PR #90 Draft; sin merge», aun cuando registra QA/CI D5; Base B separada | PR #75 MERGED `5ad75ed` y PR #90 MERGED `cf6954a` |
| 15 | `15-vehiculos-itv-progress.md:3-9,123-139`: candidato local «sin publicar», CI de SHA nuevo pendiente | PR #81 MERGED `f5bf032` |
| 16 | `16-revision-comida-progress.md:3-6,88-126`: DEV en revisión, PR #82 abierta y merge pendiente; la spec conserva gates históricos | PR #82 MERGED `26b6f0c` |
| 19 | `19-instrumentos-compras-inversion-specification.md:1499-1510` y `testplan.md:334-343`: PR #95 Draft/no merge; su propio `progress.md:12-16,38-47` ya registra integración | PR #95 MERGED `156a50d` |
| 31 | `31-sqlite-produccion-specification.md:2` indica «implementación pendiente»; la ficha progress registra PR #25 y la enmienda 31-E1 | PR #25 MERGED `511fcba` y PR #48 MERGED `8fae7a4` |

**Causa documental probable:** los cierres se realizaron mediante integración en
GitHub sin actualizar después las cabeceras del progreso; los relatos históricos
de QA, bloqueos e intentos fallidos permanecen legítimamente como evidencia. No
se debe transformar una prueba inicialmente fallida en un PASS retroactivo.

**Contrato y código contrastados parcialmente:**
- `apps/api/src/ciclos.ts`: único maestro y operaciones de ciclo;
  no se acredita aquí ejecución de pruebas con datos financieros reales.
- `apps/api/src/presupuestos.ts:86-179`: distingue las tres fuentes, conserva
  destino opcional solo para «No aplica» y unicidad de destino entre Aportaciones.
- `apps/api/src/planes-ciclo.ts:63-118,135-183`: Ejecutado de Gasto real por
  Partida, de Aportación a saldo por Transferencia ordinaria sin Referencia, y
  ejecución nula para «No aplica»; compatible en lectura con `spec09`.
- `apps/api/src/plan-anual.ts:125-245`: distingue subtotal registrado de
  total ejecutado con cobertura histórica verificable; compatible en esta
  inspección parcial con `spec10`.

**Impacto:** quien interprete las cabeceras de las SPEC como estado operativo
actual podría repetir entregas ya integradas o confundir límites históricos
con bloqueos vigentes. No hay evidencia en esta pasada de defecto económico
nuevo en los servicios analizados.

**Propuesta:** consolidar al final de la auditoría una nota escueta de vigencia
en los documentos afectados que identifique las PR integradas y distinga
resultados históricos, contratos futuros y cobertura vigente. Reutilizar
H-TRANS-01 en 07–10, sin crear PR por cada documento. No tocar código.

**Pendiente:** revisar reglas de rectificación de ciclos, efectos sobre presupuestos
y Plan del ciclo, cierre/corte financiero, históricos y pruebas/regresiones
transversales. No reclasificar como PASS las dependencias futuras no ejecutadas.

## Auditoría global — tercera pasada del lote C (SPEC11–14), 2026-10-28

**Base:** `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`.
**Alcance:** specification/progress/testplan de SPEC11–14, verificación de PR
#63/#67/#71/#75/#90 y lectura selectiva de `nomina.ts`, `flujo-mensual.ts`,
`anticipos.ts` y `compartidos.ts`; no pruebas ejecutadas ni Excel inspeccionado.
Estas SPEC **siguen en inspección**.

- **SPEC11 Nómina:** `11-nomina-prevision-progress.md:3-20` registra correctamente
  PR #63 integrada y QA Linux. El motor mantiene tratamiento explícito de
  originales y conciliación N:M; falta auditoría de consumidores/fechas en detalle.
- **SPEC12 Flujo mensual:** `12-flujo-mensual-progress.md:4-17` reconoce PR #67
  integrada y AC de integración todavía UNRUN. `flujo-mensual.ts:109-173`
  separa ingreso bancario, Gasto bruto, cuotas y extraordinarias.
  **Riesgo previamente conocido** (no hallazgo duplicado): lectura directa
  `ledgerRows()` en `monthlyFlow()`, incluso si `movementSource()` devuelve error
  estructurado. H-SPEC03-03 no prometió remediar esa ruta.
- **SPEC13 Anticipos:** PR #71 integrada (`b146eda`) aunque
  `13-anticipos-progress.md:4-15` permanece en candidato/PR Draft. En
  `anticipos.ts:75-177`, la devolución exige metadatos acreditados, par del
  adelanto y dirección inversa; se alinea con Q9 de spec13 en esta inspección.
  Ver H-TRANS-01, sin declarar cobertura global de fotos/cierres.
- **SPEC14 Compartidos:** las PR #75 Base B y #90 D5 están integradas
  (`5ad75ed`/`cf6954a`). La cabecera y el último checkpoint de
  `14-compartidos-progress.md` conservan «PR #90 Draft; sin merge».
  El servicio de aportaciones y el motor compartido están presentes.
  `B-T11`/informes y aceptación E3.2 global **no se convierten en PASS**
  por la integración; la propia documentación reconoce esos límites.
  Se amplía el mismo H-TRANS-01, sin duplicarlo.

**Siguiente contraste necesario:** fecha bancaria Nómina vs ciclo financiado,
desglose/cobertura de Flujo mensual, protección de foto de Neto de apertura,
rectificación de recuperaciones y atribución D5/compartidos, incluyendo tests
actuales y dependencias E3.5/E4. No corregir producto ni ampliar estados sin prueba.

## Auditoría global — cuarta pasada del lote D (SPEC15,16,17,19), 2026-10-28

**Base:** `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`.
Se contrastaron la documentación `specification`/`progress`/`testplan`
disponible, integración de PR reales, código de Vehículos, Revisión Comida,
Instrumentos y el contrato temporal de Ciclos. **Lectura/inspección estática**,
sin ejecución nueva de CI ni comparación del Excel físico.

### H-TRANS-01 — ampliación de vigencia documental a SPEC15,16 y 19

- **SPEC15:** `15-vehiculos-itv-progress.md:3-9,123-139` se presenta como
  candidato sin publicar y declara CI Linux pendiente. La PR funcional #81 está
  **MERGED** (`f5bf032`). La incidencia móvil P2 descrita en progreso/testplan
  forma parte del historial de QA; no se presume que siga abierta después del merge.
- **SPEC16:** `16-revision-comida-progress.md:3-6,88-126` conserva estado
  de revisión, PR #82 sin merge y autorización futura; #82 está **MERGED**
  (`26b6f0c`). La documentación mantiene **AC-25 abierto** por falta de
  contraste autorizado con el Excel v5.11; no falsear equivalencia física ni
  declarar E3.5 completada.
- **SPEC19:** `19-instrumentos-compras-inversion-specification.md:1499-1510`
  y `testplan.md:334-343` todavía indican PR #95 Draft/no merge; el progreso
  reconoce integración y GitHub confirma **MERGED** (`156a50d`).
  **Seis AC permanecen PARCIAL:** 03/24/27/30/33/34, aceptados como residuales
  sin convertirlos en PASS. La integración futura de la fecha de Compras/Ventas a
  la referencia central está asignada a **E4.2-AC3**, no a E4.1.

**Verificaciones de código realizadas:**
- `apps/api/src/vehiculos.ts:83-189` filtra Gastos vigentes por REF y año
  natural, delega por Partida al `annualExecution` E2.4 y separa subtotal,
  cobertura y hechos fuera de corte. El `AnnualProvider` histórico no está
  conectado por defecto; el total anual completo **no se infiere** de la
  mera ausencia de hechos. No se acredita cobertura histórica global.
- `apps/api/src/revision-comida.ts:108-235` distingue `Detalle`/`Reposicion`,
  devolución `Entrada` explícita y campos de evidencia; su cobertura por ciclo
  no presume continuidad histórica a partir de min/max
  (`revision-comida.ts:911-935`). La fuente de fecha en
  `revision-comida-ledger.ts` alimenta el contexto único de Ciclos; no
  genera un segundo Gasto de Movimientos.
- `apps/api/src/ciclos.ts:159-164` sigue agregando **Movimientos +
  Revisión Comida**; no hay fuente temporal de operaciones de inversión
  instalada en este contrato. `spec19 §4.6` asigna expresamente su entrega a
  E4.2, por lo que **no es un defecto atribuible a DEV19**.

### SPEC17 — diseño pendiente, ausencia justificada de progreso funcional

`17-e44-deuda-completa-specification.md:3-5,765-776` declara Q1–Q7
confirmadas, pero specification y wireframes **NO aprobados**; el testplan
`:3-8` marca todos los escenarios funcionales como **UNRUN**.
No existe `17-*-progress.md` en `main`. En esta fase no se registra como fallo
de producto ni se crea artificialmente un `progress`: solo se vigila el gate
documental antes de una eventual implementación. E1.6 ya existe, pero E4.4
es ampliación futura distinta.

**Siguiente revisión del lote:** profundizar en pruebas de cobertura de Vehículos,
vínculos E3.4 y operaciones/posición de inversión, comprobar relaciones E4.2 y
dependencias antes de clasificar anomalías como defectos técnicos. Ninguna
SPEC de este lote se declara cerrada. No hay correcciones ni PR autorizadas.

## Auditoría global — quinta pasada del lote E (SPEC20–22), 2026-10-28

**Base:** `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`.
Comparación de specification/progress/testplan, PR documentales y dependencias.
**No son entregas DEV**; todas las pruebas funcionales nuevas permanecen UNRUN.

### H-SPEC20-01 — Testplan con aprobación contradicha (documental, bajo)

- **Aprobación válida:** `20-historico-precontrol-specification.md:3-11`,
  `progress.md:5-10` y `testplan.md:5-8` confirman SPEC20 y testplan
  aprobados el 28/10, PR #87 **MERGED** (`3d70fd6`).
- **Contradicción:** el cierre de `20-historico-precontrol-testplan.md:149-158`
  todavía afirma «la spec y los wireframes no están aprobados» y pide
  aprobación futura. Esa afirmación no representa el estado vigente.
- **Alcance real:** 59 AC de diseño **UNRUN**, DT7 separado y QA independiente
  del delta AC48–59 pendiente; no hay desarrollo aprobado, importación ni Excel
  contrastado. No confundir aprobación documental con cobertura ejecutada.
- **Propuesta:** sustituir el cierre contradictorio por nota de vigencia
  remitida al estado aprobado en cabecera; preservar trazabilidad anterior.

### H-SPEC21-01 — Aprobación contradicha y PR documental desactualizada (documental, bajo)

- **Aprobación válida:** `21-pendientes-conciliacion-specification.md:3-9`
  y `testplan.md:3-8`: SPEC21 aprobada documentalmente 27/10, sin dev.
  PR #97 **MERGED** (`2364d9c`).
- **Contradicción:** `21-pendientes-conciliacion-testplan.md:93-103` finaliza
  con «Aprobación de spec | No concedida»; `progress.md:3-5` conserva
  «PR #97 publicada; sin merge». Es histórico no identificado como tal.
- **Alcance real:** 31 AC nuevos **UNRUN**, DEP E3.5 y Cierres abiertas;
  no existe implementación E3.6 ni autorización de desarrollo.
- **Propuesta:** aclarar estado documental al cierre del testplan/progress,
  sin transformar UNRUN en PASS ni abrir una PR por este ajuste menor.

### SPEC22 — aprobada sin DEV, sin hallazgo de ejecución

`22-ventas-posicion-broker-specification.md:3-12`,
`progress.md:3-5` y `testplan.md:5-19` documentan specification,
testplan y wireframes rev3 aprobados 28/10. PR #105 **MERGED**
(`7073864`). Los 45 AC continúan **UNRUN** y DEV22 **no autorizado**.
La enmienda técnica D7 en SPEC19 sobre límite de cantidad vendida debe
aprobarse aparte antes de desarrollar; E4.2-AC3 cubrirá fechas de inversión
del maestro temporal. **No se interpreta como fallo del código E4.1.**

**Recomendación del lote:** agrupar H-SPEC20-01 y H-SPEC21-01 con el ajuste
documental transversal; no corregir ni fusionar todavía. Revisar después
SPEC26/27 (cierres), 31 (SQLite) y 32 (rootless) antes de priorizar.

## Auditoría global — sexta pasada del lote F (SPEC26,27,31,32), 2026-10-28

**Base:** `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`.
Se cotejaron specification/testplan/progress disponibles, inventario físico de
servicios API/infra y PR de entrega. **No** se ejecutaron pruebas ni se inspeccionó
un VPS/instalación real.

### SPEC26/27 — futuros contratos de precierre/cierre; no defectos de runtime

- `26-e48-precierre-specification.md:3-14` y `testplan.md:5-9`:
  SPEC26 aprobada documentalmente 28/10, **16 AC UNRUN**, desarrollo no
  autorizado; precierre solo lectura, sin fotografía ni cierre.
- `27-e49-cierre-financiero-specification.md:3-15` y
  `testplan.md:5-9`: SPEC27 aprobada documentalmente 28/10, AC
  **UNRUN**, sin DEV ni cierres reales. Para cerrar exige ventana finita,
  S0 y guardas de consistencia; no se inventa Fin ni fotografía.
- **DT3/DT4** constan resueltos documentalmente; **DT6/T-BKP** sigue abierto;
  el contrato E4.9 depende de E3.5/FIN_NETA, y los AC previenen cierre con
  plan o fuentes no verificables. No clasificar la ausencia actual de motores
  E4.8/E4.9 como incidencia de implementación.
- `progress` ausente en ambas SPEC. Dado que siguen exclusivamente en
  diseño, **no se recomienda crear documentación operativa vacía**.

### SPEC31 — implementación real frente a cabecera histórica (H-TRANS-01)

`31-sqlite-produccion-specification.md:2` sigue diciendo
«implementación pendiente», aunque `31-sqlite-produccion-progress.md:107-135`
registra integración de PR #25, y GitHub confirma #25 **MERGED** `511fcba`;
enmienda 31-E1 documental #47 y funcional #48 **MERGED** `8fae7a4`.
El código de identidad, backup y pruebas de concurrencia existe en `main`.
Se incorpora este desajuste al hallazgo transversal documental sin abrir
H-SPEC31 adicional. Riesgos de fsync/WAL, Linux y despliegue documentados
siguen siendo riesgos operativos, no automáticamente errores probados.
**Falta revisión profunda de seguridad/persistencia** antes de cerrar auditoría31.

### SPEC32 — PR técnica pendiente y documentos no integrados

`32-ejecucion-rootless-specification.md:2-11` está aprobada
documentalmente. PR #29 integrada (`a7fb9d8`). La PR funcional #30 sigue
**OPEN/DRAFT**, HEAD `24ca206` (consultado directamente): su diff incluye
`specs/32-ejecucion-rootless-progress.md` y `...-testplan.md`, actualmente
ausentes de `main`, además de archivos `infra/`, scripts y CI. No duplicar
documentos ni confundir este código **no integrado** con una entrega aceptada.
Su AC22 y los gates rootless/SQLite y despliegue requieren pruebas y
autorizaciones; esta auditoría no reanuda ni fusiona PR #30.

**Estado del inventario:** las 25 SPEC han recibido al menos una primera
inspección, pero ninguna de SPEC04–32 ha superado todavía la auditoría
técnica integral ni se ha cerrado; SPEC01–03 permanecen cerradas.
Siguiente fase: pruebas focales de los hallazgos técnicos y profundización
transversal por familias, sin corrección hasta aprobación del usuario.

## Segunda inspección transversal — SPEC09, corte financiero vs Fin temporal (2026-10-28)

### H-SPEC09-01 — Ejecución cero con ciclo temporalmente delimitado sin fecha financiera (técnico/semántico, medio-alto; decisión pendiente)

- **Contrato:** `specs/09-plan-ciclo-specification.md:35-45,65-85`
  exige que, sin periodo/corte financiero verificable, `Ejecutado`,
  `Pendiente` y `Estado` sean nulos con motivo; un cero solo se acredita
  en periodo verificable sin hechos. `spec03` distingue el Fin derivado
  del siguiente Inicio de la referencia/corte financiero; el Fin por sí
  solo no declara una fotografía o cobertura de hechos.
- **Código:** `apps/api/src/ciclos.ts:126-160` da `fin` a todo ciclo con
  un siguiente Inicio, incluso cuando `financialReference` tiene
  `fecha=null`/`sin_referencia`. En `apps/api/src/planes-ciclo.ts:135-174`
  `periodReason` es `null` si existe `cycle.fin`, aunque
  `cycle.corte=null` y la fuente financiera no tenga referencia;
  `executionFacts` devuelve [] y `planResult` recibe suma `0n`,
  por lo que el DTO puede mostrar `ejecutado=0.00` y, con `delMes=0`,
  `estado=Completo`.
- **Evidencia reproducible en test existente:** `apps/api/src/planes-ciclo.test.ts:41-62`
  (`setup()`) crea ciclos `2026-10-01` y `2026-11-01` sin ningún hecho;
  `:877-889` (`P12`) cambia presupuesto a `Gasto real` y **espera
  expresamente `ejecutado: "0.00"` para el primer ciclo**. Es decir:
  la batería actual **consagra** el cero de un intervalo cerrado
  temporalmente sin evidencia financiera. Los casos abiertos
  `sin_referencia` sí devuelven null.
- **Contraste:** `apps/api/src/flujo-mensual.ts:68-90` exige una referencia
  financiera para calcular `cutoff` y además fuente `disponible`;
  por tanto, los dos consumidores no siguen exactamente la misma
  condición de disponibilidad para el mismo ciclo.
- **Juicio:** discrepancia **material** entre contrato, motor y prueba,
  pero **no se adjudica unilateralmente la semántica correcta**:
  hay que verificar si la aceptación pretende dar por verificable un
  Fin temporal sin fecha bancaria ni E3.4 (en contra de la separación
  Fin/Corte), y decidir el contrato concreto para ciclos históricos,
  ciclos adelantados y errores de fuente. La evidencia actual permite
  formular el caso pero no autoriza modificar el motor.
- **Prueba focal sugerida, sin código nuevo todavía:** fixture de dos
  inicios y fuentes instaladas sin hechos; comparar `cycleContext`,
  `getCyclePlan` y `monthlyFlow` para ciclo cerrado, `delMes=0` y
  `delMes>0`; variante con `revision_comida` corrupta/error y
  variante con fuente real fechada. Verificar cero vs null y motivo.
  Se necesita autorización para cualquier modificación funcional/test.

## Segunda inspección técnica — SPEC04, huella y concurrencia temporal (2026-10-28)

### H-SPEC04-03 — La vista previa de Movimiento no se invalida al cambiar Revisión Comida (técnico, medio)

**Contrato:** `specs/04-movimientos-specification.md:109-130` requiere
revalidar huella de impacto y contexto al confirmar, con 409 si cambian
fuentes que alteran el impacto; `specs/16-revision-comida-specification.md:302-311`
hace participar toda operación de Comida vigente en la referencia central.

**Causa demostrada en código:**

1. `apps/api/src/movimientos.ts:755-805` calcula
   `referenciaAntes` con `cycleContext(db)`, que agrega Movimientos y
   Revisión Comida, pero devuelve `contextRevision=financeRevision(db)` y
   genera `fingerprint` únicamente con `action,id,old.revision,next,annul`
   y `financeRevision(db)`. El valor de `impacto` o de la referencia
   temporal no entra en esa huella.
2. `apps/api/src/movement-ledger.ts:69-147`: `financeRevision(db)`
   incluye Movimientos, Anticipos, Nómina, Compartidos, Deuda, Referencias,
   Saldos, Inversiones, clasificaciones y Ciclos, **pero no**
   `revision_comida` ni su máxima fecha.
3. `apps/api/src/movimientos.ts:863-879`: al confirmar solo compara
   `body.contextRevision` con el mismo `financeRevision` y después
   `body.fingerprint` con una huella recalculada que sigue excluyendo
   Revisión Comida. `plan()` recalcula `cycleContext`, pero **no usa
   su referencia para la huella**, por lo que un cambio de Comida aislado
   puede pasar sin 409 aunque cambie el impacto temporal observado.

**Escenario focal recomendado (no ejecutado):** preview de rectificación
con una fecha de Comida vigente, crear/rectificar/anular una operación de
Comida con fecha que cambie el máximo central, confirmar el Movimiento
con el fingerprint viejo y comparar el resultado real con el impacto que
vio el usuario. Resultado esperado según contrato: `IMPACT_CHANGED`/
nueva revisión de impacto; no confirmar silenciosamente si la referencia
presentada cambió. Variantes: alta y anulación de Comida; fecha de
Movimientos más reciente (control negativo sin cambio de máximo).
Comprobar si el producto define explícitamente algún impacto meramente
informativo no protegido antes de modificar el contrato.

**Relación con H-SPEC04-02:** H-SPEC04-02 trata del **valor de fecha
posterior erróneo** incluso sin concurrencia; H-SPEC04-03 trata del
**control de obsolescencia** de la vista previa aun si se arregla el
cálculo de fecha. Las correcciones deben considerar ambas sin crear
fuentes de verdad adicionales.

**Estado:** comprobación estática de dependencias/huellas; pendiente de
prueba ejecutada con DB ficticia y decisión de alcance. No implica que
un Movimiento bancario se altere por una operación de Comida; el
riesgo demostrado es confirmar con información temporal distinta de la revisada.

### Precisión adicional de H-SPEC09-01

El test `apps/api/src/planes-ciclo.test.ts:881-890` corre con
`now=2026-10-24T12:00Z`, crea Inicio `2026-10-01` y siguiente Inicio
`2026-11-01` (Fin derivado **2026-10-31**, todavía futuro respecto al
reloj controlado), sin movimientos ni operaciones de Comida, y espera
`ejecutado=0.00` en el primer ciclo. Por tanto, no basta denominarlo
«periodo cerrado» para considerar que el propio test acredita su
cobertura: solo se ha derivado un Fin **temporal**. La diferencia
contractual con `monthlyFlow` sigue pendiente de resolver por autoridad
funcional; no se corrige unilateralmente.

## Controles negativos para evitar falsos hallazgos — revisión transversal (2026-10-28)

- **SPEC15 Vehículos:** el filtro `r.partida !== null` de
  `apps/api/src/vehiculos.ts:90-98` podría parecer en conflicto con
  `specs/15-vehiculos-itv-specification.md:196-209` («no filtrar
  por Partida»). Sin embargo, `apps/api/src/movement-schema.ts:19-20`
  exige `partida IS NOT NULL` para todo `Gasto` válido y
  `apps/api/src/movimientos.ts:180-190` la exige antes del alta.
  **No registrar defecto sin demostrar una ruta de histórico/migración
  admisible que contenga Gastos sin Partida.** El filtro no excluye hoy
  hechos válidos conforme al contrato SQL vigente.
- **SPEC16 Revisión Comida:** `revisionComidaSource` convierte fallos
  en la consulta de máxima fecha instalada en `error`; la prueba
  `revision-comida.test.ts:525-534` cubre rotura de columna y contexto
  central en estado `error`. No duplicar como hallazgo un escenario
  ya probado; la eventual caída del propio detector de tabla queda
  como riesgo excepcional de error de SQLite, **no defecto verificado**.

## Inspección técnica — SPEC04, guardas ante fuente temporal instalada en error (2026-10-28)

### H-SPEC04-04 — Movimientos admite plan/confirmación sin guardia de error de fuente instalada (técnico, alto provisional)

**Contrato aprobado:** `specs/04-movimientos-specification.md:116-129,230-252`
exige que el fallo de fuente instalada bloquee la confirmación de operaciones
cuyo impacto debería verificarse; no tratar fallo como `sin_referencia`,
`Sin cierres`, `cero` ni cobertura exitosa.
`specs/03-ciclos-financiados-specification.md:74-86` establece referencia
central como `error` sin máximo si falla una fuente instalada.

**Ruta real revisada:**
- `apps/api/src/revision-comida-ledger.ts:51-75` captura el fallo SQL de su
  lector temporal como `{source:"Revisión Comida",state:"error"}`.
- `apps/api/src/ciclos.ts:58-82,126-164` propaga el estado global
  `referencia.estado="error"`, `fecha=null` y deja `corte=null`.
  La prueba `apps/api/src/revision-comida.test.ts:525-534` acredita el
  caso de columna `estado_registro` renombrada y el estado central `error`.
- `apps/api/src/movimientos.ts:632-634` utiliza `cycleMaster(db)`,
  que devuelve ciclos con referencia en error **sin lanzar excepción**.
  `movimientos.ts:755-806` vuelve a consultar `cycleContext(db)` para
  el impacto, pero **no comprueba** `contexto.referencia.estado`.
  El DTO admite `referenciaAntes=null` y una fecha
  `referenciaDespues` que ya se calcula de manera distinta
  (H-SPEC04-02).
- `movimientos.ts:825-829,831-885`: `previewMovement()` y
  `writeMovement()` llaman a `plan()` sin un bloqueo por
  `REFERENCE_ERROR`; validan únicamente huella, revisión de
  Movimiento y `guard` opcional de cierres. La ruta HTTP de
  `apps/api/src/app.ts:933-999` no instala ninguna otra guardia
  de referencia temporal: solo transmite `options.movementGuard`
  (protección diferente, ajena al lector Comida).

**Hipótesis técnica verificable:** con una BD demo ficticia y contratos
vigentes, crear primero un Movimiento y registrar una operación Comida;
provocar `ALTER TABLE revision_comida RENAME COLUMN estado_registro TO
estado_registro_broken` en fixture aislada (la prueba de Comida ya lo
utiliza). Comprobar `cycleContext(db).referencia.estado === "error"`.
Invocar `previewMovement()` y `writeMovement()` para un nuevo Ingreso
normal o una rectificación permitida sin relación Comida, con sus
huellas actualizadas. Verificar si se escribe/valida pese al error:
el contrato exigiría bloqueo explícito y **ausencia de mutación**.
Control negativo: fuente temporal disponible sin hechos debe seguir
siendo admitida cuando las demás guardas lo permitan.

**Alcance/gravedad:** a diferencia de H-SPEC04-03 (concurrencia entre
vista previa y confirmación), H-SPEC04-04 trata de **fallo conocido en
el momento de ambas operaciones**. La ausencia de la guarda es
observable estáticamente, pero la ruta completa de API con base
corrupta no se ha ejecutado; gravedad **alta provisional** por falta
de comprobación de impacto, no porque se haya demostrado pérdida de
datos. Revisar autorización de comportamiento para altas vs
rectificación/anulación antes de imponer una prohibición más amplia
que el contrato.

**Dependencias:** H-SPEC04-02/03 y H-SPEC09-01 deben considerarse
juntos: reutilizar estado/corte central, sin una implementación
paralela de Comida ni un reloj/fallback artificial. No modificar
código ni tests de producto sin aprobación del usuario.

## Plan de contraste focal sin mutar producto — H-SPEC04-02/03/04 y H-SPEC09-01 (2026-10-28)

Esta matriz es **diseño de pruebas**, no una ejecución ni permiso para modificar
código. Usar solo SQLite efímera y hechos ficticios; comprobar valores exactos,
estado de fuente/corte y no escritura antes/después de operaciones bloqueadas.

| Test | Escenario | Oráculo esperado del contrato | Evidencia actual / incertidumbre |
| --- | --- | --- | --- |
| F04-T1 | Movimientos tiene máximo 10/10; Comida vigente máximo 12/10; vista previa anular/rectificar movimiento del día 10 | `referenciaDespues` conserva 12/10; no retrocede si Comida aún es máxima | H-SPEC04-02: actual solo reordena fechas de Movimientos; reproducción dinámica UNRUN |
| F04-T2 | Preview de rectificación; después insertar Comida vigente con nueva fecha máxima; confirmar con huella de preview anterior | Bloqueo `409 IMPACT_CHANGED`, sin modificar Movimiento ni auditoría | H-SPEC04-03: `financeRevision` no contiene Comida, huella no incluye impacto; UNRUN |
| F04-T3 | Comida instalada con consulta de fecha corrupta **antes** de pedir preview de Movimiento | Error explícito de fuente instalada, sin impacto presentado como comprobado; no confirmar | H-SPEC04-04: código no verifica `contexto.referencia.estado`; UNRUN |
| F04-T4 | Preview válido; romper solo la consulta temporal Comida **entre preview y confirmación** | Confirmación rechazada sin escritura; distinguir error de fuente de desajuste de huella | Interacción H-SPEC04-03/04; UNRUN |
| F04-T5 | Comida instalada pero vacía; Movimientos válidos; una alta legítima | No bloquear una fuente `disponible,maxDate=null` solo por ausencia de hechos | Control negativo para no introducir guardas artificiales; UNRUN |
| F09-T1 | Ciclos 01/10 y 01/11, sin Movimientos/Comida; consulta 24/10 con plan `Del mes=0` y `Del mes=100` | Contrato SPEC09 exige `Ejecutado=null`, `Pendiente/Estado=null`, motivo de corte no acreditado; resolver contradicción con test P12 que espera 0 | H-SPEC09-01: conducta 0 consagrada por P12; necesita criterio definitivo |
| F09-T2 | Mismos ciclos; máxima referencia financiera antes del `Inicio` del ciclo consultado, o `reference.estado=error` | No convertir un Fin derivado en cobertura verificada; seguir estado central y causa | Verificar además consistencia con `monthlyFlow`; UNRUN |
| F09-T3 | Dos ciclos, fuente disponible y fecha máxima posterior al comienzo; sin hechos elegibles dentro del periodo seleccionado | **No prejuzgar** cero: distinguir si el intervalo completo está acreditado frente a simple referencia posterior; documentar interpretación R3/SPEC09 antes de cambiar tests | Caso discriminante para decidir semántica histórica y control de cobertura; UNRUN |

### Priorización y acoplamiento

1. **Primero F04-T3/T4**: riesgo de escritura con fuente temporal en `error`.
   Definir alcance exacto de bloqueo para alta, rectificación y anulación.
2. **Después F04-T1/T2**: garantizar que vista previa y confirmación operan
   sobre la misma referencia central, sin copiar una lógica alternativa.
3. **F09-T1/T2/T3**: resolver ambigüedad del Fin temporal frente a corte
   verificable; no adaptar el contrato a una expectativa errónea de test.
4. **Regresión transversal**: mantener `cycleContext`, `monthlyFlow`,
   Revisión Comida y posiciones Saldos sin fuentes duplicadas ni datos reales.
   Si los contratos obligan a recalcular fingerprints, controlar también
   intentos idempotentes y concurrencia tras una alteración de Comida.

**Autorización vigente:** investigación estática y documentación en
`audit/spec04-25`. No crear/modificar tests o código de producto sin
aprobación del usuario; el contraste independiente se pidió a OpenCode por
relay 0006. Ninguna SPEC se da por cerrada.

### Controles de no regresión revisados sin nuevo defecto

- `apps/api/src/plan-anual.ts:97-121` y SPEC10 §«Equivalente esencial»:
  solo `Esencial=Sí` contribuye al equivalente, `Pendiente` tiene contador
  separado; `plan-anual.test.ts:296-317` comprueba ambos. No registrar
  omisión de Pendiente como bug.
- `apps/api/src/flujo-mensual.ts:297-335`, SPEC12 §Liquidez y
  `spec19 §4.3.3/N2`: el estado de Liquidez actual puede ser
  `Verificado` para posiciones calculables y, simultáneamente, advertir
  falta de histórico de Compras. Es una distinción **explícitamente aprobada**,
  no un fallo de cálculo de liquidez actual.
- `apps/api/src/compartidos.ts:318-510` conserva Neto =
  Bruto − Recuperado y Pendiente/Exceso por Tercero sin compensarlos; el
  `estado` general considera ambos. `estadoReparto` subyacente se
  presenta aparte en UI como dato de Base B, no como sustituto del estado
  general. No registrar estados divergentes como fallo sin incumplimiento
  adicional demostrado.
- `apps/api/src/flujo-mensual.ts:80-112` exige fecha de referencia
  central, sin promover un subtotal bancario parcial a un flujo completo.
  El error estructural del lector Movimientos que puede impedir construir
  `ledgerRows` ya está documentado en H-SPEC03-03; no duplicarlo.

## Contraste independiente OpenCode #0007 — verificación y reclasificación (2026-10-28)

**Fuente:** mensaje remoto #0007 de `coord/spec-audit-relay`,
blob `90c58ce02e55f8c4cc5643ad1b4beaf2aa3af212`,
base `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`.
OpenCode declara haber ejecutado reproducciones con esquema real y
**SQLite en memoria**, sin commits ni pruebas añadidas al repositorio.
Álex contrastó el diagnóstico con las reglas y rutas vigentes, pero
**no ejecutó por separado estas pruebas**.

### H-SPEC04-02 — Confirmado por reproducción dinámica ajena

Con una operación Revisión Comida ficticia de fecha 30/10, la vista previa
de un Gasto del 20/10 devuelve referencia `antes=30/10` y
`después=20/10`; el máximo central real continúa en 30/10.
La causa es `movimientos.ts:804-805`: el máximo posterior ignora
Comida. Mantener ID **H-SPEC04-02 = referencia posterior errónea**.

### H-SPEC04-03 — Confirmado por reproducción dinámica ajena

OpenCode introdujo una operación Comida entre vista previa y confirmación.
`financeRevision()` no cambió; la confirmación con
`fingerprint/contextRevision` previos fue aceptada, sin 409.
Esto prueba el desajuste de control de concurrencia en
`movimientos.ts:755-770,863-879` y
`movement-ledger.ts:69-145`. Mantener ID **H-SPEC04-03 =
invalidación de huella ante cambios Comida**.

**Nota de identidad:** el texto conclusivo de OpenCode #0007
intercambió las etiquetas H-SPEC04-02 y H-SPEC04-03, pero sus
reproducciones y explicación causal confirman ambos fenómenos.
**No intercambiar ni reasignar los IDs ya publicados en el tracker.**

**Alcance de posible solución (a evaluar):** no imponer sin justificación
que todas las operaciones de Comida formen parte de `financeRevision`
**global**, porque invalidaría potencialmente consumidores ajenos.
Priorizar una huella de impacto temporal local que consuma la referencia
y cobertura centrales, junto a cálculo `después` sobre el agregado
de fuentes. Definir pruebas de 409 y control negativo para cambios de
Comida que no modifiquen el impacto efectivo. Esta es una orientación
arquitectónica, **no diseño aprobado ni autorización de código**.

### H-SPEC09-01 — Retirar clasificación de defecto demostrado

OpenCode reprodujo P12 con dos Inicios (01/10, 01/11), consulta 24/10
y cero hechos: Fin derivado del primer ciclo = 31/10 (futuro),
`corte=null`, referencia `sin_referencia`, `ejecutado=0.00`.
El motor sigue el contrato interpretado por P12/AC17: **Fin temporal
define un intervalo de hechos registrados**, no una fotografía de
cierre ni un dato patrimonial al corte. La discrepancia con
`monthlyFlow` no demuestra por sí sola que uno de los consumidores
incumpla su definición, ya que Fluxo solo permite subtotales con
referencia central. El documento SPEC09 no establece con precisión
si el Fin futuro basta para **cero verificable** en ausencia de
cobertura bancaria efectiva.

**Decisión de auditoría:** H-SPEC09-01 pasa de posible defecto
medio-alto a **ambigüedad de presentación/semántica de bajo riesgo
confirmado**; no solicitar corrección automática ni alterar P12.
Dejar abierta la decisión funcional futura: ¿el cero significa
«sin hechos registrados en intervalo ya delimitado» incluso si el
Fin aún es futuro, o se exige referencia/corte acreditado para
mostrar cero/Completo? Hasta decidirlo, conservar comportamiento
vigente y advertencia UI «Fin temporal no equivale a cierre
financiero». No deducir cobertura histórica de la existencia de Fin.

### H-SPEC04-04 — Sigue sin contraste independiente

El mensaje #0007 responde a la consulta #0006 y **no evalúa**
la nueva observación H-SPEC04-04, creada después.
Mantener **alto provisional**, sin confundirla con la confirmación
de H-SPEC04-02/03. Próximo contraste read-only: corromper lector
temporal de Comida, verificar referencia central `error`, y
comprobar si preview/confirmación de Movimiento bloquean
sin escritura. No agrupar su aceptación funcional con SPEC09.

## Contraste independiente OpenCode #0009 — H-SPEC04-04 CONFIRMADO (2026-10-28)

**Fuente:** mensaje remoto #0009 en `coord/spec-audit-relay`,
blob `3f2f9aeffeccdde47e3704afa0f4997c2fe29e2d`, sobre
`main` `1ed2a834334d94d121df82b77a497a35f75ec50a`.
OpenCode declara ejecución de reproducciones con SQLite efímera y
esquema real, sin cambios a producto ni tracker. Álex ha cotejado
el mecanismo con el código y contrato; **no ha repetido la prueba
de ejecución de forma independiente**.

### Evidencia de reproducción

- Ciclos 2026-10-01/2026-11-01, Saldo/Partida, Movimiento y Comida ficticios.
  Al renombrar `revision_comida.estado_registro` en SQLite de prueba,
  `cycleContext().referencia` pasó a `{fecha:null,estado:"error"}`,
  con cobertura: Movimientos disponible, Revisión Comida error e
  Inversiones pendiente.
- En ese estado `previewMovement` devolvió vista previa de alta válida,
  con `referenciaAntes=null`. `writeMovement` **insertó** la nueva fila
  de Movimiento y auditoría. Vista previa y confirmación de
  rectificación también **se aceptaron** y modificaron el original.
  Estado final observado por OpenCode: **2 Movimientos y 3 filas de auditoría**
  tras alta y rectificación bajo referencia central en error.
- **Control negativo:** Revisión Comida instalada vacía produce
  `estado:"sin_referencia"`, no `error`; alta y confirmación siguen
  admitidas con normalidad. No bloquear toda ausencia temporal.
- **Protección indirecta descartada:** `movimientos.ts:593-634,755-806,
  824-885` no exige disponibilidad del estado de referencia;
  `app.ts:933-1000` delega solo a `movementGuard` opcional, ajeno
  al lector Comida. Validadores de revisión, idempotencia,
  duplicado y saldo no sustituyen esta condición.

### Contrato, prioridad y remedio sugerido

- `specs/04-movimientos-specification.md:115-121,233-239`
  prescribe bloquear confirmación con **error de fuente instalada**,
  sin inventar coberturas. El contrato no permite tomar
  `estado:error` por `sin_referencia`.
- El propio código de `apps/api/src/ciclos.ts:477-485` ya emplea
  `Problem(409,"REFERENCE_ERROR", "Una fuente instalada ha fallado...")`
  cuando `temporalSources(db).estado === "error"`. Esta **convención
  existente** es preferible a inventar un error nuevo; cualquier
  adaptación deberá respetar el contrato de estados de API y UI.
- **Veredicto:** H-SPEC04-04 **CONFIRMADO** por reproducción ajena,
  cotejo estático propio y contrato explícito. Prioridad **alta** por
  permitir confirmaciones sin verificación del impacto temporal;
  riesgo de integridad **medio**, sin indicios demostrados de
  corrupción de importes, pérdida de datos o fraude.
- **Alcance mínimo a acordar antes de desarrollo:** bloquear de modo
  transaccional las confirmaciones que requieran verificar la
  referencia central cuando la fuente instalada devuelva `error`.
  Tratar también la vista previa con error claro, sin mostrar
  un impacto como validado. Cubrir alta, rectificación y anulación,
  replay/idempotencia, persistencia/auditoría no mutadas cuando se
  rechaza, y control negativo `sin_referencia`. La anulación
  permanece **pendiente de prueba dinámica**, no se le atribuye
  una escritura ya reproducida.
- Orden recomendado del lote: **H04-04** (guardia ya exigida),
  **H04-02** (agregado temporal de antes/después),
  **H04-03** (invalidez del consentimiento/huella).
  Su corrección puede agruparse por dependencia, pero **no está
  autorizada** y no debe extender `financeRevision` global sin
  analizar consumidores.

### Intercambio siguiente

Por relay #0010 se confirma a OpenCode el cambio de estado, se
aclara que no debe programar ni abrir PR y que el paso siguiente
es propuesta de pruebas/corrección acotada sujeta a aprobación
expresa del usuario. Las 22 SPEC permanecen sin cierre integral.

## Inspección cruzada — Nómina documental, media y pronóstico (2026-10-28)

### H-SPEC11-01 — Elegibilidad de pronóstico puede depender del cobro y contradecir referencia documental estructural (técnico/semántico, medio provisional)

**Fuente:** `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`,
`specs/11-nomina-prevision-specification.md:88-122,175-206`,
`apps/api/src/nomina.ts:147-236,503-543,594-648`,
`apps/api/src/nomina-mensual.ts:42-121`,
`apps/api/src/nomina.test.ts:160-183,706-765`.
Comprobación **estática**, sin ejecución focal nueva ni conclusiones del Excel físico.

**Dos consumidores del mismo maestro con filtros distintos:**

1. `structuralDocumentReference(p)`, consumida por
   `monthlyReference` para la **Media estructural**, permite Neto
   documentado verificado como fuente salarial aunque **no existan
   asociaciones bancarias**. Exige operandos, procedencia y evidencia;
   admite discrepancias Histórico/Documentado si la resolución
   conserva `originalContext` vigente. Correctamente no fabrica
   ingresos bancarios ni exige `fechaCompleta`.
2. `payrollForecast()` filtra en cambio por
   `p.netoCompleto && p.exactos.deducciones !== null && !p.discrepancia`
   sobre `payDetail()`. Si falta Neto histórico, `payDetail`
   fija `neto` en el **subtotal de abonos bancarios atribuidos**
   (o null sin abonos) y `netoCompleto` solo es true cuando
   `referencia === totalCobrado`. Así, una Ordinaria con Neto
   documentado **completo y verificado**, sin cobro o con cobro parcial,
   puede contribuir a la media documental y quedar excluida del
   pronóstico aun teniendo fuente salarial verificable.
3. Si Histórico y Documentado difieren, `payDetail.discrepancia`
   permanece true incluso después de seleccionar explícitamente una
   fuente documental vigente con `accion:"resolver"`. El mismo
   caso es apto para `structuralDocumentReference` si la
   resolución sigue vigente, pero `payrollForecast` lo excluye
   incondicionalmente por `!p.discrepancia`. La resolución para
   conciliación y la prioridad de Neto Q5 son contratos diferentes;
   **no** se recomienda eliminar las guardas antes de aclarar
   cuáles operandos fiscales son válidos para pronosticar.

**Contraste contractual:** SPEC11 §Referencia de pronóstico exige
Ordinarias documentadas con operandos y contexto de Neto
**verificables**, independientes de caja/ciclo real, pero no afirma
de forma inequívoca que una paga pendiente de cobro sea siempre apta.
Además §Adaptación explícita de Neto a la app conserva el Neto
histórico con prioridad y declara parciales los derivados hechos con
un **Neto bancario parcial**. Las pruebas `P3/P19` sí fijan
conservadoramente la exclusión del caso con cobro parcial y sin
histórico. Es posible que esa exclusión fuese intencional, por lo que
**no se califica todavía de defecto confirmado**.

**Pruebas/decisión focal sugeridas (UNRUN):**
- **N11-F1**: paga Ordinaria con devengo/base/IRPF/variable/guardia y
  **Neto documentado=1500**, verificado con evidencia; Histórico=null,
  ningún Movimiento. Comparar `structuralDocumentReference`,
  `monthlyReference` y `payrollForecast`: registrar qué recibe cada
  consumidor y si la ausencia bancaria debe bloquear realmente una
  simulación exclusivamente documental.
- **N11-F2**: mismas fuentes y un abono atribuido de 600/1500; no
  alterar ingreso real ni fingir `Neto completo` bancario. Verificar
  si el pronóstico debe consumir deducciones derivadas del documento
  completo o seguir bloqueado conforme a P19.
- **N11-F3**: Histórico=1000 y Documentado=900, ambos verificados,
  resolución explícita vigente eligiendo Documentado; comprobar
  referencia de media y elegibilidad del pronóstico. Cambiar después
  original para invalidar resolución y comprobar que ambos niegan
  la referencia obsoleta.
- **Control negativo**: documento ausente/pendiente, operandos
  incompletos o reconciliación sin evidencia nunca generan
  referencia ni estimación definitiva.

**Recomendación:** pedir contraste independiente **solo de lectura**
antes de modificar código/test. Si la política es que «Pronóstico
requiere Neto bancario completamente conciliado» debe documentarse
expresamente como requisito más restrictivo que Media documental;
si es una barrera accidental, definir un **único contrato de
referencia salarial verificable**, preservando origen y prioridad
Q5, sin copiar movimientos ni sumar salarios como ejecución.
No abrir PR ni asignar prioridad de corrección sin esa decisión.

## Contraste independiente #0012 — H-SPEC11-01, elegibilidad documental y pronóstico (2026-10-28)

**Fuente:** relay #0012 de OpenCode, rama `coord/spec-audit-relay`,
blob `7ae4a8fedb69512a0d7610f978b0f1e28177c8dd`,
base `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`.
OpenCode declara haber reproducido N11-F1/F2/F3 en SQLite efímera con
datos ficticios; Álex contrastó las reglas, el código y las conclusiones,
**sin repetir ejecución dinámica**.

| Caso ficticio | Referencia documental / media | `payDetail` | Pronóstico |
| --- | --- | --- | --- |
| N11-F1 · documentado 1.500 verificado, histórico null, banco sin vínculos | `structuralDocumentReference.exacto=1500`; media 1.500, estado Parcial (1 mes) | `neto=null`, `netoCompleto=false`, `referencia=1500` | No disponible |
| N11-F2 · misma paga con vínculo bancario parcial 600 | Media 1.500 | `neto=600`, `netoCompleto=false`, `referencia=1500`; derivados parciales | No disponible |
| N11-F3 · Histórico 1.000, Documentado 900, discrepancia resuelta explícitamente hacia Documentado | `structuralDocumentReference.exacto=900`; media 900 | `neto=1000` por prioridad Q5; deducciones 80; `discrepancia=true` | No disponible |

**Juicio:** la divergencia observada es **real y reproducida**, pero
`spec11` no obliga a utilizar para pronóstico toda fuente apta para la
media estructural. Q5 distingue original histórico, documentado, saldo
cobrado, referencia conciliada y fuente fiscal; P3/P19 protegen la
exclusión conservadora de abonos bancarios parciales. La discrepancia
resuelta para conciliación tampoco sustituye automáticamente Neto
histórico Q5 ni acredita deducciones del pronóstico.

**Precisión:** el filtro del pronóstico **no exige siempre ingreso bancario
completo**. Cuando existe `Neto histórico` verificado,
`payDetail.netoCompleto` puede ser verdadero sin vinculaciones
bancarias; la exclusión analizada en F1/F2 surge en la rama
sin Histórico. F3 cae por `!discrepancia`, incluso tras resolución.
No describirlo como obligación universal de conciliación bancaria.

**Reclasificación del hallazgo:** H-SPEC11-01 se mantiene como
**ambigüedad funcional documentada**, **no bug confirmado**,
riesgo bajo de cálculo y posible sorpresa de UX. No se propone
cambiar motor ni pruebas actuales. Antes de cualquier extensión
futura habría que decidir: (a) si documento completo y verificado
puede alimentar pronóstico sin cobro, y (b) si una discrepancia
resuelta habilita pronóstico, con qué Neto/deducciones sin mezclar
fuentes ni reescribir originales. Una decisión afirmativa sería
cambio de contrato, no parche automático.

**Control de regresión futuro (sin persistir hoy):** fijar F1, F2 y F3
con su comportamiento vigente y un caso negativo de documento
incompleto. Si el usuario aprueba un criterio diferente, aprobar
primero su oráculo y después adaptar test e implementación.

## Controles de regresión cruzada — SPEC12/13/14 (2026-10-28)

**Base:** `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`.
Revisión estática de fuentes, motores y suites existentes. No se ejecutó
ningún test nuevo ni se verificaron saldos/datos reales de Excel.

- **SPEC12 Flujo mensual:** `flujo-mensual.ts:68-112,115-203`
  separa cobros bancarios por fecha del hecho de Nómina documental;
  cuotas ordinarias son subconjunto de `Gasto`, extraordinarias se
  descuentan aparte y la suma informativa de Deudas no se resta por
  segunda vez. `flujo-mensual.test.ts:31-76` fija importes sintéticos
  y cobertura parcial por falta de histórico. No abrir defecto por
  `operativo.valor=null`: la especificación prohíbe presentar el
  subtotal como S completo mientras falte cobertura bancaria.
- **SPEC13 Anticipos:** `anticipos.ts:75-178,333-550` deriva
  Adelantado/Recuperado/Neto desde Transferencias con rol y par
  acreditados, sin crear un Gasto de recuperación ni importar su
  importe al plan. `anticipos.ts:736-863` conserva una foto manual
  de apertura por REF+Ciclo con evidencia y revisión, no un neto vivo.
  `anticipos.test.ts:394-480` ya prueba devolución posterior, foto
  negativa explícita, cero verificado y corrección excepcional
  bloqueada. **No registrar una supuesta falta de foto automática**:
  su confirmación manual es una regla de diseño.
- **SPEC14 Compartidos:** `compartidos.ts:207-382,434-515`
  mantiene `Neto=Bruto−Recuperado` y pendientes/excesos
  individualizados. `d5-aportaciones.test.ts:195-227` prueba que
  pendiente 150 y exceso 150 de terceros distintos se conservan
  **sin compensarse** y no declaran el caso Cerrado. B-T11 de
  informes/E3.6 permanece fuera de la integración, sin duplicar
  el Neto en Flujo mensual.
- **Límite de esta pasada:** todas las verificaciones anteriores son
  de coherencia de contrato/implementación **puntual**, no
  certificación de importes de la base física ni cobertura global.
  No se abre hallazgo adicional SPEC12/13/14 sin evidencia de un
  caso que contradiga los contratos ya probados.

## Segunda inspección de inversiones y deuda — control económico transversal (2026-10-28)

**Base de lectura:** `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`.
Lectura de `compras.ts`, `investment-engine.ts`, `saldos.ts`,
`deudas.ts`, `movimientos.ts`, SPEC06/SPEC19, tests
`compras.test.ts`, `inversiones-ac.test.ts` y `deudas.test.ts`.
**No se ejecutaron pruebas nuevas**, no se modificó producto ni se
contrastó con Excel físico. Resultado: **sin nuevo defecto técnico
confirmado** en las rutas examinadas.

### Controles favorables (no emitir falsas incidencias)

- **Efectivo de Inversiones:** `investment-engine.ts:149-250`
  calcula apertura + entradas − salidas − Compras vigentes.
  `cashAt` no suma comisiones por segunda vez y conserva Ventas
  como término estructural cero mientras E4.2 no esté implementada.
  `spec19:279-289` permite que apertura ausente contribuya cero
  **solo en cálculo**, sin sobrescribir el dato original. Por eso no
  registrar `BigInt(saldo.apertura ?? "0")` como defecto.
- **Suficiencia de Compras:** `investment-engine.ts:268-319` recorre
  la fecha propuesta y todas las fechas posteriores de movimientos y
  Compras, evaluando saldo de fin de día. Una rectificación elimina
  el efecto anterior y aplica la nueva fecha/importe en el escenario
  antes de guardar. `compras.ts:471-567,588-698` repite validación
  dentro de transacción `IMMEDIATE`, no solo en preview.
  `compras.test.ts:291-365,523-557` y
  `inversiones-ac.test.ts:252-369` fijan fronteras de DST,
  retroactividad, operaciones del mismo día, 422
  `INSUFFICIENT_CASH` y 409 de revisión/contexto. No afirmar
  que esos PASS se han repetido en esta ronda.
- **Posición y doble registro:** `investment-engine.ts:322-387`
  agrega cantidades de Compras vigentes por `Saldo inversión +
  Instrumento`; `compras.ts:502-585,631-744` persiste Compra
  y auditoría, no un segundo Movimiento/Gasto/Transferencia.
  `spec19 §4.2/4.4/4.5` conserva la distinción inversión
  frente a efectivo; precio/cambio histórico no sustituyen el
  EUR efectivamente cargado.
- **Integración con Saldos y Movimientos:**
  `saldos.ts:134-167` y `movimientos.ts:658-710`
  consumen `cashAt`, sin recalcular un saldo alternativo.
  `spec19 §4.3.3` admite una huella global de inversiones
  que sobreinvalida previews de Movimientos para garantizar
  contexto actualizado; `compras.test.ts:523-557` comprueba
  `409 IMPACT_CHANGED`. No confundir esta sobreinvalidación
  autorizada con H-SPEC04-03 (Comida omitida de la huella).
- **Deuda:** `deudas.ts:23-46` deriva capital pendiente de
  apertura menos capital amortizado, no cuota íntegra;
  `:238-290` separa cuotas de Gasto y amortizaciones
  extraordinarias para el consumidor mensual sin duplicar Gasto.
  `deudas.test.ts:812-845` cubre frontera de inicio y
  múltiples Partidas ligadas a un ID de Deuda; el contrato
  `spec06:43-82` no exige tipo adicional en el SUMIFS de
  capital si el registro ya valida los desgloses elegibles.

### Límite material y riesgo residual (no hallazgo aún)

**Q7 de SPEC19 solo impone suficiencia estricta al alta/rectificación
de Compras**, no convierte toda salida bancaria de Movimientos
en una operación sometida al mismo bloqueo global de saldo.
Un Gasto/Transferencia posterior puede reducir el efectivo
del bróker y los motores mostrarían la posición recalculada.
`spec19:348-365` dispone expresamente que Q7 «no es una regla
global de Saldos». Por tanto, **no se propone imponer aquí
el rechazo automático de Movimientos por efectivo negativo**,
sin verificar el contrato E1.4 y recibir decisión funcional.
Es una observación de riesgo de liquidez/UX, no prueba de
violación de un contrato vigente.

**Fuera del alcance implementado:** Ventas E4.2 (incluida cantidad
no negativa en futuras ventas y fuente temporal de inversión),
valoración E4.3, conciliación de histórico importado y cierre.
No atribuir sus ausencias a E4.1 ni declarar cobertura de
posición patrimonial completa.

**Verificación posterior de protecciones de maestros:**
- `movement-ledger.ts:147-170` (`saldoHasEconomicUse`) protege
  `tipo`, `control`, `saldoApertura`, `fechaApertura` y
  `permiteSalidaExterior` ante uso histórico tanto por cualquier
  Movimiento como por una Compra (vigente o anulada), sin reutilizar
  el estado financiero como identidad. `saldos.ts:383-428` aplica
  `HISTORY_LOCKED` dentro de transacción y revalida `revision`.
  `inversiones-ac.test.ts:286-313` contiene los oráculos de los
  cinco campos, con Compras existentes. Una desactivación no borra
  los hechos; la ficha sigue computando posición.
- `clasificacion.ts:253-272` bloquea cambiar la Deuda de
  una Partida con Movimientos (`HISTORY_LOCKED`).
  `deudas.ts:183-216` protege Inicio/capital de apertura cuando
  existe cualquier Movimiento vinculado, conservando auditoría.
  `movimientos.ts:709-752` evalúa el principal de ambas Deudas
  afectadas por una rectificación, retirando primero el efecto
  anterior y rechazando `DEBT_EXCESS` si el resultado aplicable
  es negativo; `deudas.test.ts:760-810` prueba concurrencia y
  bloqueo por capital.
- **Límite:** lectura de mecanismos y pruebas versionadas, no
  ejecución nueva ni demostración de ausencia absoluta de bypass.
  No hay incidencia adicional confirmada por estos contratos.

**Próximo paso de la auditoría:** profundizar en rectificación de
Movimientos vinculados a saldos con Compras, protecciones de
dependencias y estados de fuente sin convertir la
disponibilidad del efectivo en una garantía implícita de
suficiencia. Mantener seguimiento separado de los defectos
confirmados H-SPEC04-02/03/04.

## Segunda inspección técnica — SPEC31 SQLite/backup y restauración (2026-10-28)

**Base:** `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`.
Contraste **estático** de `backup.ts`, `private-state.ts`,
`database-identity.ts`, `database-schema.ts`, SPEC31 y
su `testplan/progress`. No se ejecutó proceso SQLite, age,
restauración, prueba sobre VPS ni simulacro físico.

**Resultado de esta revisión:** no se identifica nuevo defecto
reproducido en las rutas examinadas. Las guardas clave aparecen
implementadas y existen pruebas históricas asociadas, pero
**no equivale a certificar despliegue/durabilidad en producción**.

- **Origen y clave:** `private-state.ts:117-195` exige rutas
  canónicas y área privada, valida archivo DB/clave y sidecars,
  verifica identidad productiva/huella en el mismo handle SQLite
  antes de entregar la conexión. Los controles de inode/owner/modo
  y `O_NOFOLLOW` en la lectura de clave no deben confundirse con
  cobertura de ataques físicos fuera del modelo.
- **Copia consistente:** `backup.ts:40-67,69-207` hace
  `VACUUM INTO` a snapshot privado, comprueba
  `integrity_check`, `foreign_key_check`, versión/manifest,
  enlaza DB con su clave y cifra separadamente la base y la clave
  mediante age. Realiza `fsync` y publica un directorio completo
  por la rutina de `private-state.ts` en lugar de sobreescribir
  destino existente. La atomicidad de **publicación lógica**
  no implica durabilidad física garantizada tras corte eléctrico.
- **Restore sin pisar datos:** `backup.ts:210-343` exige destino
  nuevo; valida checksum, antigüedad de la copia (24h salvo
  aceptación explícita), integridad, versión, origen/identidad y
  clave. Antes de publicar revoca `sessions`, desafíos y tablas
  de intentos identificadas por versión; conserva datos y
  auditorías del snapshot. No reinyecta saldos ni cambia la
  identidad del usuario por inventar datos.
- **Límites vigentes:** `31-sqlite-produccion-progress.md:104-135`
  advierte que un `fsync` fallido después del rename puede
  dejar un conjunto íntegro cuya durabilidad no se puede
  prometer, y que UID/root, Linux/glibc/renameat2, WAL/volumen,
  recuperación tras pérdida física y despliegue real no están
  certificados. La integración de PR #25/#48 **no elimina**
  esos riesgos; no tratar CI verde como simulacro de desastre.
  SPEC32 rootless continúa en PR #30 Draft/no merge.

### Ensayos pendientes recomendados, sin autorización para ejecutarlos

| ID | Escenario | Oráculo / riesgo |
| --- | --- | --- |
| F31-T1 | Snapshot con escritor concurrente y WAL activo; restaurar en directorio privado nuevo | Datos, IDs, auditoría, versión y checksum coherentes; clave correcta; no alterar DB fuente |
| F31-T2 | Crear copia y provocar fallo de `fsync` antes/después de `rename` | Distinguir rechazo/limpieza antes de publicación de conjunto ya publicado que debe preservarse e inspeccionarse; no sobrescribirlo |
| F31-T3 | Restaurar origen production con identidad distinta o clave cambiada; probar symlink/hardlink y sidecars | Fallo seguro sin reutilizar contraseña/MFA ni sustituir estado preexistente |
| F31-T4 | Instalar raíz/UID y volumen del entorno rootless real (solo cuando autorizado) | Comprobar permisos 0700/0600, ownership del contenedor, `renameat2`, WAL, espacio y recuperación duradera; no extrapolar desde CI |

**Veredicto:** SPEC31 sigue **en inspección** (ya integrada
técnicamente), sin nuevo hallazgo técnico confirmado. Riesgos
de operación y recuperación física abiertos. SPEC32 es dependencia
de despliegue, no una corrección ya autorizada; no reanudar PR #30.

## Segunda inspección transversal — rectificación histórica, Compras y Partidas (2026-10-28)

**Base fija:** `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`.
Se releen `movimientos.ts:755-985`, `investment-engine.ts:149-320`,
`compras.ts:471-743`, `clasificacion.ts:416-646`,
`planes-ciclo.ts:477-567`, SPEC04/08/19 y suites de Movimientos,
Compras e Inversiones. **Lectura estática, ninguna prueba nueva ejecutada**.
Esta ronda no confirma un nuevo fallo de cálculo; distingue un
**riesgo de evolución temporal de caja permitido** de un defecto.

### R-INV-01 — Una rectificación de Movimiento puede dejar negativo el efectivo con Compra histórica (riesgo de uso, no BUG acreditado)

- `investment-engine.ts:149-215` deriva efectivo del bróker de
  apertura, Movimientos vigentes y Compras. `assertSufficient` es
  guard de altas/rectificaciones de **Compras** y evalúa mínimos
  de fin de día en fechas posteriores.
- `movimientos.ts:658-700,832-885` calcula/enseña el nuevo
  `antes/despues` usando `cashAt`, pero no invoca
  `assertSufficient` ni impone saldo positivo al rectificar
  transferencias o gastos. No debe deducirse automáticamente que
  omite una guarda obligatoria: **SPEC19 Q7/§4.3.2 declara que
  suficiencia no es una regla general de Saldos ni de Movimientos**.
- **Ejemplo sintético para verificar semántica (NO prueba ejecutada):**
  apertura bróker 0 €; Transferencia a efectivo de inversión de
  1.000 €; Compra de 800 € válida; rectificación posterior de
  Transferencia a 500 € ⇒ efectivo resultante **−300 €**. La
  Compra histórica persiste, pero su suficiencia al capturar no
  equivale a garantía perpetua de caja positiva tras cambiar
  otros hechos reales. No inferir cargo, crédito ni autorización
  bancaria a partir de ese saldo de aplicación.
- La suite revisada `compras.test.ts:523-666` cubre
  invalidación de preview por Compra y previsualización de
  Gasto/Ingreso/Transferencia/Amortización sobre Efectivo/Inversiones.
  `inversiones-ac.test.ts:252-459` cubre rectificación de Compra,
  concurrencia y `HISTORY_LOCKED`. **No se encontró en estas suites
  un test focal que rectifique una Transferencia ya ejecutada
  después de existir una Compra financiada con ella**. Esto es
  una brecha de cobertura puntual, no prueba de comportamiento
  incorrecto.

**Pruebas propuestas (sin implementarlas ni ejecutarlas):**

| ID | Fixture | Oráculo conforme al alcance vigente |
| --- | --- | --- |
| F19-M1 | Transferencia 1.000; Compra 800; rectificar Transferencia a 500 con vista previa vigente | No inventar un veto global de suficiencia; si se admite por guardas vigentes, efectivo −300, Compra e importe sin cambio, auditoría y revisiones correctas |
| F19-M2 | Misma financiación; anular Transferencia histórica después de Compra | Recalcular efectivo al retirar solo ese Movimiento; Compra permanece vigente y se muestra resultado exacto, sin doble gasto ni mutación de inversión |
| F19-M3 | Vista previa sobre efectivo de bróker, Compra intermedia, confirmar con huella antigua | 409 `IMPACT_CHANGED`, sin escrituras; control ya presente en E4.1-AC53, comprobar también rectificación/anulación |
| F19-M4 | Cambiar solo nombre de Saldo o Instrumento con Compra registrada, y luego intentar cambiar apertura, control, tipo o salida a Exterior | Los nombres no reescriben historia; campos económicos protegidos dan 409 `HISTORY_LOCKED` y preservan operación/auditoría |

**Criterio:** mantener el comportamiento aprobado. Si se desea que
una rectificación bancaria que dejaría efectivo negativo sea
rechazada, requiere **decisión nueva de alcance** y estudio de
coste de oportunidad: impediría corregir un hecho bancario verdadero
para satisfacer artificialmente una regla de suficiencia de Compra.
Una alternativa menos invasiva sería advertir claramente del
saldo negativo, sin falsear los hechos. No se solicita cambio hoy.

### Control de atribución Presupuesto (sin hallazgo nuevo)

- `clasificacion.ts:491-544,563-637` invoca
  `planConfigurationImpact` al cambiar
  `Partida.presupuesto`, aporta diferencias por ciclos e
  impide la escritura si `budgetExecution.blocked`.
  Los cambios económicos utilizados requieren previsualización,
  fingerprint y motivo explícito, con revalidación en transacción.
- `planes-ciclo.ts:477-566` calcula antes/después por
  Presupuesto, Partida y Ciclo; detecta hechos afectados que
  caen fuera de ciclos asignables y periodos no verificables.
  `clasificacion.test.ts:391-448` acredita bloqueo cuando
  existe un Gasto anterior al primer Ciclo. No confundir cambio
  permitido con reescritura de un Movimiento ni inferir que el
  vínculo presupuestario surge del Concepto.
- Sigue pendiente la semántica ya abierta H-SPEC09-01 de Fin
  temporal/periodo verificable: no resolver por una regla
  genérica ni registrar un segundo hallazgo duplicado.

**Situación del relay:** no se envía mensaje nuevo, al no haber
consulta material que requiera contraste independiente. Se
mantienen H-SPEC04-02/03/04 confirmados como prioridad y
separados de esta nota de riesgo/regresión.

## Segunda pasada — SPEC10/15/16 y dependencias de Precierre/Cierre (2026-10-29)

Base de lectura: `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`. Sin ejecución nueva de tests, cambios en código/Excel ni dev de SPEC26/27.

### H-SPEC26-01 — Posiciones a Fin no disponibles en API de inversión vigente (dependencia futura, no bug E4.1)

**Contrato futuro:** `specs/26-e48-precierre-specification.md:89-94,191-192` pide `cashAt(...,fin)` y `positionsFor(...,fin)`, incluyendo Compras anteriores al ciclo y excluyendo posteriores al Fin. `specs/27-e49-cierre-financiero-specification.md:146-149,169-171,210-220` exige inmovilizar esa posición histórica en la fotografía.

**Motor real:** `apps/api/src/investment-engine.ts:351-383` exporta `positionsFor(db,instrumento)` sin parámetro temporal: su SELECT incorpora todas las Compras vigentes, con independencia de Fecha. También `positionQuantity(db,saldoInversion,instrumento)` carece de corte. Por contraste, `cashAt(db,saldoEfectivo,fecha)` sí admite fecha y la aplica. Estas funciones cumplen el alcance actual E4.1; SPEC26/27 carecen de desarrollo autorizado.

**Escenario hipotético, no ejecutado:** al fotografiar el Fin 28/02 con una Compra posterior el 15/03, reutilizar directamente `positionsFor` mostraría unidades de marzo mientras `cashAt(...,fin)` excluiría esa salida de efectivo. Sería una mezcla indebida de fechas.

**Acción de diseño antes de DEV26/27:** dar al motor único una consulta de posiciones a fecha de fin de día, reutilizable y compatible con Compras−Ventas cuando E4.2 esté disponible, sin crear un calculador paralelo en Precierre/Cierre. Tests futuros UNRUN: P26-F1 Compra anterior/en/posterior al Fin; P26-F2 cartera heredada sin Compras en ciclo; P26-F3 rectificación/anulación y Venta con corte; P26-F4 foto ya congelada no se altera por T2/T3. **No requiere hotfix E4.1 y no autoriza ningún PR.**

### Controles positivos con código y tests existentes (no tests repetidos)

- **SPEC10 · Plan anual:** `plan-anual.ts:132-260` suma Gastos vigentes por Fecha real y Partida, verifica unión temporal de intervalos de control e histórico y evita solapes. `plan-anual.test.ts:168-295` cubre corte, histórico, parcialidad y cero verificable; `annualEquivalent` no trata Esencial «Pendiente» como «Sí».
- **SPEC15 · Vehículos:** `vehiculos.ts:83-203` suma Gastos vinculados a REF por Partida, reutiliza `annualExecution`, distingue hechos fuera de control y año futuro. `vehiculos.test.ts:707-880` cubre mezcla de cobertura, abierto/completo, diciembre natural, rectificación y anulación. Sin duplicación acreditada; histórico aún sin proveedor activo.
- **SPEC16 · Revisión Comida:** `revision-comida.ts:110-235,245-330,450-538,638-721` exige dirección/devolución, separa Detalle/Reposición y vínculos meramente trazables; `revision-comida.test.ts:469-556,1017-1044` prueba referencia temporal, error de fuente y ciclo abierto. **AC-25 de equivalencia con Excel v5.11 permanece pendiente**, sin asumirla por tests ficticios.

### Gates de SPEC26 y SPEC27

SPEC26 es **precierre de solo lectura**, admite estado parcial y no crea cierre ni foto. Sin siguiente Inicio no inventa Fin (`SIN_SIGUIENTE_INICIO`). SPEC27 no permite publicar fotografía con **E3.5/FIN_NETA no verificable** ni sin respaldo externo recuperable DT6/T-BKP; la huella propia del cierre no puede sustituirse por `financeRevision`. Sus reglas T1/T2/T3 y comparación con fotos de cierres posteriores aún requieren implementación/pruebas. La ausencia de DEV26/27, E3.5/E4.2 y backup externo **no es defecto del código vigente** sino condición para autorizar y aceptar cierre futuro.

## Segunda pasada de gates de diseño — SPEC17/20/21/22 (2026-10-29)

Contraste de lectura contra las specifications y el estado del repositorio
`main` `1ed2a834334d94d121df82b77a497a35f75ec50a`; sin ejecuciones
de tests nuevas, sin desarrollos autorizados en estas cuatro SPEC.

| SPEC | Estado documental | Contrato que no debe reinterpretarse | Gate vivo |
| --- | --- | --- | --- |
| 17 / E4.4 Deuda completa | D1–D7 confirmadas, specification/wireframes aún NO aprobadas | Deuda viva es apertura−principal desde Inicio control; conciliación declarada no modifica principal ni crea Saldos | Falta aprobación de specification y DEV; DT7/importe histórico real fuera de alcance |
| 20 / E4.5 Histórico precontrol | SPEC/testplan aprobados, DEV NO autorizado | Histórico solo suma cuando tiene procedencia, intervalo, mapeo y no representación en Movimientos **acreditados**; universo de fuentes/Partidas requiere DT7 | 59 AC UNRUN; mapping/identidad de fuentes DT7 sin aprobación final |
| 21 / E3.6 Pendientes y conciliación | SPEC/testplan aprobados, DEV NO autorizado | Reutiliza motores Anticipos/Compartidos/Comida; separa pendiente real, alerta, no disponible y Neto compartido, sin segunda fuente; aportaciones de tercero no son Ingresos ordinarios | 31 AC UNRUN; E3.5/FIN_NETA aún no operativa; no emitir falsa cifra completa |
| 22 / E4.2 Ventas | SPEC/testplan y wireframes aprobados; DEV NO autorizado | Venta de inversión no es Movimiento/Gasto; la cantidad es Compras−Ventas y no puede bajar de cero en ninguna fecha posterior; referencia temporal compartida incorpora inversión **solo al implementar E4.2-AC3** | 45 AC UNRUN; D7 exige enmienda de SPEC19; sin Ventas, posición E4.1 solo Compras |

**Comprobación transversal:** `specs/20-historico-precontrol-specification.md:82-92,124-140,252-356`
exige universo y fuentes acreditadas DT7; su proveedor futuro de
E2.4 no puede transformar datos incompletos en cero o `total` anual.
`specs/21-pendientes-conciliacion-specification.md:102-120,280-332`
distingue Neto por Gasto del Neto global de caso y no debe contabilizar
una aportación como ejecución del Presupuesto. `specs/22-ventas-posicion-
broker-specification.md:134-174,264-294` exige la comprobación temporal
de unidades y la referencia central actualizada. No se registra
defecto en código actual por estas funcionalidades ausentes.

**Relación con H-SPEC26-01:** el acceso a posiciones a Fin
deberá tener en cuenta el motor temporal de Ventas si E4.2 está
instalado. No reutilizar sin fecha el `positionsFor` actual
y no sumar histórico de capital/archivo como unidades de
inversión no verificadas.

**Estado:** documentación/gates revisados más profundamente, las
cuatro SPEC siguen **abiertas**; no dar por implementado ni
probado ningún AC todavía UNRUN.

## Segunda pasada técnica — SPEC32 rootless: desviación de baseline, release y restauración (2026-10-29)

**Lectura remota:** `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`,
PR [#30](https://github.com/jmartinlabs/myfinanzas-app/pull/30)
**OPEN/DRAFT**, HEAD `24ca206e8dab2a40ca504f49ffab2a9756721580`.
No merge, tests nuevos, acceso a VPS, modificación de infraestructura ni cambio de código.
La especificación 32 está aprobada para desarrollo, pero las fases de
exposición Caddy/HTTPS, offsite y activación requieren otros permisos.

### H-SPEC32-01 — Gate de compatibilidad rootless desfasado respecto a `main` (integración, prioridad alta)

**Hechos comprobados en código y documentación:**

1. `apps/api/src/database-identity.ts:4`: rama PR #30 declara
   `schemaVersion=16`, `main` vigente declara `18`.
   La PR se reconcilió en 2026-10-27 con `main` `26b6f0c`
   (v16); aún no demuestra la integración sobre `main` actual.
2. `specs/32-ejecucion-rootless-testplan.md` **en la propia PR**,
   sección «Estado vigente» y «AC-18/D2», mantiene una matriz
   de **rollback 16→16** y continuidad por módulos v7–v16, con
   ejecución Linux/rootless del candidato pendiente. **AC-18 y
   AC-22 están pendientes para el candidato vigente**, aunque una
   tabla inferior conserve PASS históricos para un SHA anterior
   `3094563`. `specs/32-ejecucion-rootless-progress.md`
   reitera que la CI posterior no hereda esos resultados.
3. `infra/tests/release-fixture.mjs:5-17` (PR #30) fotografía
   32 tablas hasta v16; **no incluye** `movimiento_compartido`
   (v17) ni `instrumentos`, `operaciones_inversion`,
   `instrumento_audit`, `operacion_inversion_audit` (v18).
   `apps/api/src/compartido-aportacion-schema.ts` instala v17;
   `apps/api/src/instrumento-schema.ts:4-105` instala v18.
   Que `infra/release.py:42-54` derive dinámicamente la
   etiqueta de contrato de `schemaVersion` y `backup.ts`
   **no** completa por sí mismo la matriz de hechos y auditorías.
4. El contrato aprobado `specs/32-ejecucion-rootless-
   specification.md:153-177,227-234` exige demostrar
   actualización y rollback compatibles de esquema, datos,
   autenticación y **todas las escrituras confirmadas**.
   Los tests de matriz de PR #30, en su forma actual, **no
   proporcionan ese oráculo para las novedades de v17/v18**.

**Consecuencia:** no existe evidencia suficiente para aceptar PR
#30 sobre la base financiera vigente. No se afirma que
fusionarla **downgrade automáticamente** SQLite: Git podría
preservar los archivos v18 de `main`, pero aun así la integración
de scripts/test/imagen con v18 no se ha demostrado. **Esto es un
bloqueo de verificación/aceptación, no una brecha explotada ni un
defecto nuevo del código financiero integrado.**

**Pruebas focales propuestas (NO ejecutadas):**

| ID | Escenario ficticio | Oráculo de aceptación |
| --- | --- | --- |
| F32-B1 | Reconciliar PR con main v18 y construir imagen/manifiesto desde la nueva base | Contrato/esquema e imagen corresponden al mismo SHA; no se pierde ninguna migración ni guardia de Dev31 |
| F32-B2 | Datos v17: aportación Compartido + sus relaciones/auditoría; actualizar y retornar a release anterior compatible | Referencias, importes, participaciones, IDs, auditorías, clave y resultados derivables iguales tras ida/vuelta |
| F32-B3 | Datos v18: Instrumento y Compra vigentes con comisión, cantidad y efectivo, además de auditoría e intentos donde proceda | Conservar cantidades/efectivo EUR, relaciones, estados, auditorías e identidad; ninguna Compra se duplica ni se vuelve Gasto |
| F32-B4 | Rollback 18→versión anterior de esquema incompatible o manifiesto con prueba insuficiente | Bloqueo seguro, sin pérdida de escrituras ni restore sobre estado existente; mantener DB real intacta |
| F32-B5 | Suite completa + pruebas de imagen/rootless sobre HEAD final reconciliado en runner compatible | AC-18 y AC-22 con PASS del SHA exacto, no por herencia de 3094563; R6/fsync siguen con límites explícitos |

**Recomendación:** mantener **PR #30 DRAFT/pausada**; cuando el
usuario autorice reanudar, actualizar baseline y pruebas con
un propietario serializado, verificar SHA final y revisar
independientemente antes de pedir permiso de merge. Sin ampliar
el alcance a Caddy, VPS, copias externas ni permisos de producción.

### Límite con SPEC31 y E4.9

El backup/restore local cifrado e íntegro de SPEC31, y los
simulacros rootless efímeros de SPEC32, **no cumplen todavía**
DT6/T-BKP del cierre: ese gate exige copia **externa**,
custodia independiente y restauración **real acreditada** con
frecuencia definida. SPEC32 separa explícitamente fase B
(offsite/retención/alertas) y fase de activación. No concluir
que el destino externo existe o que se puede cerrar un Ciclo
por haber instalado `age` o disponer de un snapshot local.

### Observación de seguridad y permisos

`infra/runtime.py` solo **renderiza** una unidad de usuario;
el runbook indica que no instala ni arranca nada.
Los parámetros `keep-id`, UID, puerto loopback, permisos
0700/0600, state/WAL y restricciones rootless
constan en candidato, pero las evidencias históricas
del runner Ubuntu no sustituyen la validación del Debian
13 y filesystem reales. La PR no toca Caddy activo.
No se registra nueva vulnerabilidad sin ejecución/superficie
de ataque demostrada.

## Contraste transversal SPEC07/08 — revisión de Ciclos con fuente Revisión Comida instalada (2026-10-29)

**Base:** `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`.
Lectura estática de `ciclos.ts:58-81,159-195,377-562,574-685`,
`revision-comida-ledger.ts:39-74`, `revision-comida.ts:245-329,828-950`,
`presupuestos.ts:86-181,263-412` y SPEC07/08/16. No se ha ejecutado
una prueba nueva ni alterado código/Excel/maestros.

### H-SPEC07-01 — Contexto de confirmación de Ciclos puede ignorar cambios de Comida anteriores al máximo (PROVISIONAL, nivel medio)

- `ciclos.ts:481-559` monta `facts = ledgerRows(db)` y
  `contextRevision = fingerprint([beforeRows, facts, reference])`.
  Para Comida, `reference` es `financialReference([...,
  revisionComidaSource(db)])` y esta fuente aporta **solo**
  `state` y `maxDate`, no todos los registros. El listado de
  hechos afectados `movimientos` usa únicamente `ledgerRows`.
- `revision-comida-ledger.ts:52-73` calcula
  `MAX(fecha)` de filas vigentes. Añadir, corregir o anular
  una operación anterior a ese máximo, sin moverlo,
  **no altera por sí solo el fingerprint de Ciclos**, aunque
  `revision-comida.ts:245-255,287-329` derive el ciclo
  de cada operación según los Inicios actuales.
- **Escenario inicialmente inferido; posteriormente REPRODUCIDO por OpenCode en relay #0015:**
  ciclos existentes con Inicio 01/10/2026 y 01/11/2026;
  Comida vigente 20/10/2026 fija máximo. Se revisa
  rectificar Inicio 01/10→05/10. Antes de confirmar,
  aparece una nueva operación de Comida 03/10. El máximo
  sigue 20/10; el nuevo hecho cambiaría de ciclo a
  «Sin ciclo asignable» después de rectificar. Si no
  cambia ningún Movimiento ni el maestro, la huella
  parece permanecer igual y aceptar una revisión que
  **no enumeró ese hecho**. No atribuir importes erróneos
  ni foto de cierre, porque estos cálculos no están en
  el contrato operativo.
- **Contrato a interpretar:** SPEC07 §Q1 exige revisar los
  hechos afectados y bloquear cuando falle consumidor
  instalado. SPEC07 AC28 es de **integración futura** de
  Comida/inversión (máximo/periodos/corte/cobertura).
  SPEC16 ya integra la fuente de fecha de Comida, pero
  E3.5/conciliación no existe aún. Distinguir una
  **brecha de integración pendiente** de incumplimiento
  actual del requisito AC17 de invalidación del contexto.
  No inferir que `conciliacion:pendiente` es un bug:
  se refiere al cierre E3.5, no a la referencia de E3.4.
- **Pruebas propuestas inicialmente; C07-F1/F2/F3 ya ejecutadas por OpenCode en SQLite ficticia (NO reejecutadas por Álex):** C07-F1: reproducir
  rectificación 01/10→05/10 con Comida máxima 20/10 y
  alta 03/10 entre preview/confirmación, sin cambios
  de Movimientos ni del máximo; observar 409 o aceptación,
  estado de operaciones antes/después y auditoría.
  C07-F2: Comida ya existente en fecha del tramo que
  perderá ciclo, preview antes de rectificar, y
  `totalMovimientos=0`; comprobar si se declara
  explícitamente **cobertura de Comida pendiente** o
  si parece «sin efectos». C07-F3: control de Comida
  fuente error, que **sí** debe bloquear 409
  `REFERENCE_ERROR`, y control sin Comida instalado
  (pendiente legítimo).
- **Estatus actualizado:** los fenómenos F1/F2 son **CONFIRMADOS como comportamiento** por la reproducción de #0015; la calificación como incumplimiento actual permanece **PROVISIONAL** hasta determinar si AC28 se exige ya para E3.4 o continúa pendiente. No solicitar corrección/PR ni replicar H-SPEC04-03 automáticamente.
  La revalidación de dato temporal y el detalle
  de impactos son dos cuestiones distintas.

### Contraste independiente OpenCode #0015 — C07-F1/F2/F3 (2026-10-29)

**Fuente de evidencia:** mensaje #0015 de OpenCode en
`coord/spec-audit-relay`, blob
`8c5084d9a3c145c4248d98ee14c0c86f55a0b8b4`,
base `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`.
OpenCode informa pruebas en SQLite **en memoria y ficticia**; Álex contrastó
estáticamente `apps/api/src/ciclos.ts:473-559,574-655`,
`apps/web/src/Ciclos.tsx:1015-1070` y
`revision-comida-ledger.ts:52-73` y SPEC07 Q1/AC07/AC17/AC28.
Álex **no reejecutó** los casos. No hay prueba sobre Excel real.

| Caso | Resultado observado | Clasificación |
| --- | --- | --- |
| **C07-F1** · C1 Inicio 01/10→05/10 y C2 01/11; Comida 20/10 máx.; añadir Comida 03/10 entre preview y confirmación | Máximo sigue 20/10; `contextRevision` `8280342d…e69903ff` e `impactRevision` `7f8b4bd9…b165f722` **idénticos**; confirmación acepta contexto antiguo, escribe auditoría y Comida 03/10 cambia de C1 a sin ciclo | Conducta **CONFIRMADA**; incumplimiento actual **PROVISIONAL** |
| **C07-F2** · Comida 03/10 ya existente antes de preview | `totalMovimientos=0`, `movimientos=[]`; UI «No hay hechos que cambien de ciclo»; Comida pasa de C1 a sin ciclo tras confirmar. UI informa E3.5 pendiente, pero **no dice** que las operaciones Comida no están enumeradas | Omisión de presentación/atribución **CONFIRMADA**; exigibilidad AC28 **PROVISIONAL** |
| **C07-F3** · fuente Comida instalada y rota | Preview/confirmación 409 `REFERENCE_ERROR`, sin ciclo ni auditoría modificados | Supuesto fallo de guarda **DESCARTADO** |
| Control negativo · agregar Comida 24/10 moviendo máximo | Confirmación de preview anterior da 409 `CONTEXT_CHANGED`, sin escrituras | Guarda por cambio de referencia **FUNCIONA** |
| Control fuente instalada vacía / no instalada | `sin_referencia`; preview permitido | Diferenciación con error **FUNCIONA** |

**Riesgo material:** una fecha de Inicio nueva cambia la atribución
derivada de una operación real de Revisión Comida sin que aparezca en
la revisión ni fuerce nueva confirmación; la UI puede inducir a
interpretar la ausencia de Movimientos como «ningún hecho afectado».
**No** se ha acreditado corrupción de importes, efectivo,
principal de Deuda o cantidad de Inversión. La operación Comida
conserva ID y EUR; su Ciclo se deriva de la fecha y el maestro.

**Frontera contractual:** SPEC07 AC07 I/AC17 I piden hechos
y revalidación de contexto; AC28 **C** reserva la integración
de fuentes Comida/inversión a una fase posterior. SPEC16
ya incorporó fuente de fecha y ciclos derivados de operaciones
Comida, pero no la cobertura plena E3.5. La reproducción no
resuelve si la instalación E3.4 **activa** toda la exigencia AC28.
Por ello no se eleva aún a bug financiero confirmado ni se
marca SPEC07 cerrada.

**Recomendación de auditoría, sin autorización de desarrollo:**

1. **Protección informativa mínima recomendada:** que la
   revisión muestre «Hechos de Movimientos afectados: N»,
   sin el engañoso «No hay hechos que cambien de ciclo»
   cuando Comida pueda verse afectada; indicar explícitamente
   «Operaciones de Revisión Comida no enumeradas en esta
   revisión; su ciclo derivado puede cambiar». Si esa
   cobertura no es aceptable para confirmar cambios de Inicio,
   habría que bloquear esas rectificaciones hasta disponer
   del cálculo completo: decisión funcional del usuario.
2. **Integración completa AC28 futura:** utilizar fuente
   única de hechos Comida y su revisión/huella para preview
   y confirmación de Ciclos, incluyendo antes/después y
   verificación transaccional de los consumidores realmente
   instalados; no duplicar maestros, no convertir Comida
   auxiliar en Gasto central ni exigir E3.5 para consultar
   atribución por fecha cuando E3.4 ya la conoce.
3. **Pruebas persistentes solo tras autorización:** F1 debe
   esperar 409 si se integra huella de operaciones de
   Comida; F2 debe mostrar su atribución o un
   límite explícito; conservar F3 y controles de máximo/ausencia.
   En ningún caso dar por PASS AC28/AC27 de E3.5 a partir
   de un aviso UI.

**Prioridad:** media de UX/consentimiento, posterior a
H-SPEC04-02/03/04 en integridad económica. Sin PR,
sin cambiar SPEC, sin implementar hoy.

### SPEC08 — controles de Presupuestos verificados estáticamente

- `presupuestos.ts:86-181` acepta exactamente
  Gasto real/Aportación a saldo/No aplica, exige saldo
  interno para las dos primeras, `null` para la última,
  conserva destino inactivo solo al renombrar,
  y rechaza destinos duplicados entre Aportaciones
  incluidas las inactivas. La unicidad de nombre
  implementa comparación sin distinguir mayúsculas,
  conservando acentos y espacios.
- `presupuestos.ts:263-365` llama a
  `planConfigurationImpact` en cambios de fuente
  o destino, compara revisión y fingerprint,
  solicita motivo cuando hay impacto y vuelve
  a validar en transacción; `:367-412` impide
  desactivar con Partidas activas vinculadas.
  `presupuestos.test.ts` B1–B9 cubre alta,
  nombres, histórico y concurrencia.
- **Sin defecto nuevo confirmado** en esta inspección.
  No se declara PASS nuevo de suites, equivalencia
  con Excel, ni garantía de motor E2.3
  fuera de su cobertura ya auditada.

## Coherencia SPEC01 ↔ código — 2026-10-28

Base de la comprobación: `main` `d6be96b`; PR #115 documental. **No se modifica código.**

| Regla vigente | Implementación / consumidores | Evidencia | Resultado |
| --- | --- | --- | --- |
| Identidad Sxxx, S000 protegido, sin borrado | Triggers de esquema, `saldos.ts`, UI de ficha | `database-schema.ts` (triggers), `app.test.ts` AC-03/06/34 | Coincide |
| Pares habilitados y Manual conceptual | `pairs`, `position`, selector de UI | `app.test.ts` AC-06/27/34 | Coincide: S000 técnico y Manual no habilitados |
| Defaults M2, POST/PATCH y ausencia histórica | `validated`, `args`, formulario | AC-28/35/41 | Coincide |
| Dinero exacto, fechas y límites | `money`, `decimal`, validación | AC-13/29/33 | Coincide; apertura null = 0 neutral aprobado (H resuelto) |
| Saldo actual Movimientos | `positionCents`; `GET /api/saldos`; UI | AC-30; `app.test.ts`; `movimientos.test.ts` | Coincide con la decisión 2026-10-28 |
| Inversiones/Efectivo | `cashAt`; E4.1; UI | `compras.test.ts` | Coincide con la decisión 2026-10-28; E4.2/E4.3 delimitados |
| Acceso/API/CSRF/idempotencia | `app.ts`, sesión y pruebas | AC-18/20/23 | Coincide |
| UI, switches y estados | `Saldos.tsx`, `SaldoForm.tsx`, Playwright | AC-22/28/37/42/43 | Coincide; capturas históricas |
| Backup/restauración | `backup.ts`; pruebas age | AC-24/25/26 | Coincide en local; destino externo DT6 abierto |
| Protección de cierres | Sin `api/cierres` ni tablas de cierre | `grep` en `apps/api/src`; SPEC26/27 | Sin runtime; delimitado, no contradicción |
| Cabecera E1.3 | `CycleHeader` | Sin AC de E1.1 | Integrada después; no acreditada por pruebas E1.1 |

### H-SPEC01-01 — Apertura vacía: resuelto por decisión expresa (2026-10-28)

**Historial del hallazgo:** la SPEC exigía ausencia ≠ cero y el código trataba la
apertura `null` como 0 en la posición calculada:

- `apps/api/src/movement-ledger.ts:42` usa `opening ?? "0"`.
- `apps/api/src/investment-engine.ts:209` usa `saldo.apertura ?? "0"`.
- `apps/api/src/saldos.ts:150-166` expone esos cálculos en `posicion`.
- `apps/api/src/app.test.ts:206-209` y `apps/api/src/compras.test.ts:196` fijan `0.00`;
  el seed de S001 (`database-schema.ts:185-205`) tiene apertura `null`.

**Decisión del usuario:** se elige la opción de **cero neutral**:

1. `saldoApertura` `null` y `0` siguen siendo distintos en almacenamiento y API.
2. El cálculo del Saldo actual usa 0 € como elemento neutro cuando la apertura está vacía.
3. El campo no se rellena automáticamente.
4. Se mantienen las fórmulas vigentes de Movimientos y Efectivo/Inversiones.
5. No se extiende a Objetivo, Manual, datos históricos ni otras ausencias.

**Consecuencia:** la SPEC, el testplan y este registro se actualizan para reflejar la
decisión. El código y los tests actuales ya implementan el cero neutral; **no se modifica
código ni se añade cobertura parcial**. La clasificación histórica fue «SPEC correcta y
código/tests discrepantes»; la decisión resolvió la regla a favor del cero neutral.

**Cobertura de tests revisada:** apertura `null` sin movimientos (`app.test.ts`,
`compras.test.ts`), apertura `null` con movimientos (`movimientos.test.ts`,
`cycle-operations.test.ts`) y cero explícito en almacenamiento (`app.test.ts`).
**Gap:** no hay una aserción específica de cero explícito + movimientos; se propone
añadirla en una PR de pruebas autorizada, sin modificar código en #115.

**Consumidores:** `GET /api/saldos`, listado/ficha de `Saldos.tsx`, agregados de liquidez
y futuras fotos de cierre. El impacto esperado del 0 neutral queda aceptado por la
decisión; no se introduce `null` ni cobertura parcial en la posición.

**Estado:** **RESUELTO.** No se modifica código en PR #115. SPEC01 no se declara
`Cerrada` hasta la validación e integración de la PR.

**Dependencias futuras delimitadas:** E4.2 Ventas, E4.3 valoración/patrimonio, DT6
externo y cierres E4.8/E4.9 no tienen runtime; no se exige desarrollarlos para cerrar
esta auditoría. E1.3 está integrado, pero no queda acreditado por las pruebas E1.1.

## SPEC02 — Revisión y hallazgos

**Estado:** revisada por Álex; correcciones documentales D1–D4 en curso. **H-SPEC02-01
abierto**; no se cierra SPEC02.

### D1 — Estados históricos
SPEC02, brainstorming, testplan y progress conservan «modelo propuesto/sin DDL»,
«continuidad futura», «pantallas pendientes», «sin merge» y «esperar E1.3». Se separará
estado actual (E1.2 cerrada PR #11, esquema 18) de la evidencia original, conservando
decisiones y pruebas.

### D2 — AC-19, AC-24, AC-25 y AC-26
Siguen siendo 4 contratos; las implementaciones posteriores no son PASS E1.2:
- AC-19 parcial: Movimientos/Referencia, planes anuales detectados, presupuesto solo al
  cambiar `presupuesto`; indicadores/cierres sin runtime.
- AC-24 implementado después en E1.4/E1.5 (`reference-rules.ts`, `movimientos.ts`).
- AC-25 implementado después en E3.1/E3.2 (`anticipos.ts`, `compartidos.ts`).
- AC-26 sin consumidor runtime de `anual`/`mensual`.

### D3 — Rectificación y Partida→Deuda
`clasificacion.ts` previsualiza padre/métodos/Referencia/Presupuesto/Deuda.
`movement-impact.ts` cubre Movimientos y Referencias. Cambiar `deuda` de una Partida con
Movimientos bloquea con `HISTORY_LOCKED`; `deudas.ts` consume el vínculo en `debtPeriod`.
**La protección Partida→Deuda no se relaja.** `classificationGuard` es opcional y no se
suministra en producción.

### D4 — Cobertura real de impacto
- Completa: catálogo/descendientes; Movimientos si el ledger está instalado.
- Parcial: plan anual (detecta uso, no muestra líneas); Presupuesto/R3 solo al cambiar
  `presupuesto`; Deuda con protección específica sin detalle general.
- Sin cobertura genérica: Anticipos, Compartidos; sin runtime: indicadores y cierres.

### H-SPEC02-01 — Funcional · Resuelto e implementado
**Deficiencia:** `pending` no es exhaustivo, `annualPlans` no se muestra y hay mensajes
obsoletos de Presupuestos. **Clasificación:** SPEC correcta y código/UI incompleto; no
cambia reglas financieras, permisos de rectificación ni Partida→Deuda.

- **API:** en `clasificacion.ts`/`movement-impact.ts`, mantener `pending` y añadir
  `parcial` y `noAplica` (o equivalentes) para separar comprobado/parcial/pendiente/no
  aplicable; incluir Deudas, Anticipos, Compartidos, Referencias, Planes, Indicadores y
  Cierres según corresponda. No crear un motor paralelo.
- **UI:** en `Clasificacion.tsx`, mostrar los cuatro grupos y renderizar `annualPlans`
  ya devueltos por la API; sustituir mensajes obsoletos que presentan Presupuestos como
  no implementado cuando `budgetExecution` existe.
- **Pruebas:** `apps/api/src/clasificacion.test.ts` (contrato de cobertura y planes);
  `tests/e2e/classification.ts`/`catalog.spec.ts` (visibilidad y mensajes); regresión de
  bloqueo Partida→Deuda. Sin código en la PR documental.
- **Estado:** **RESUELTO e integrado por PR #119** (merge `da93682`). Implementación
  final: `checked/partial/pending/notApplicable`; sin ciclos → partial; `PlanImpact`
  conserva `coverage`; E2E 390/1440 y regresión Partida→Deuda. SPEC02 se cierra al
  integrar esta PR de seguimiento.

## SPEC03 — Revisión y hallazgos

**Estado:** **CERRADA** — PR #122 (HEAD validado `7483709`; squash `52eaec0`,
2026-10-28); validación de Álex y merge autorizado. H-SPEC03-01/02/03 resueltos;
verificación posterior en `main` con CI `40761769656` fast PASS.

Base funcional: E1.3 integrada por PR #13 (squash `ff9d18d`, 2026-10-21). Después se
incorporaron Movimientos (E1.4) y Revisión Comida (E3.4) como fuentes temporales;
Inversión sigue pendiente como fuente temporal (sin proveedor conectado); SPEC22
aprobada documentalmente; DEV22 no iniciado; proveedor temporal de inversión pendiente.
Se conservan los 24 AC con sus resultados históricos.

### H-SPEC03-01 — Estados actuales obsoletos (documental)

Los cuatro documentos conservaban estados de 2026-10-21: PR #13 pendiente de merge o
implementación en curso, y —en spec/testplan— las tres fuentes aún inexistentes.
**Corrección:** cabeceras de estado y bloques «Estado actual (2026-10-28)» en
spec/testplan/progress/brainstorming; la evidencia de 2026-10-21 se conserva sin
reescritura. **Estado: RESUELTO** e integrado en #122 (`52eaec0`).

### H-SPEC03-02 — Consumidores y contratos futuros (documental)

Movimientos y Revisión Comida ya alimentan `financialReference()`; Inversión no.
AC-09 se mantiene como resultado histórico de E1.3 y AC-11/23/24 conservan C: no se
reclasifican como PASS. **Corrección:** notas de vigencia y límites en spec/testplan,
incluido el estado de SPEC22 (aprobada documentalmente; DEV22 no iniciado).
**Estado: RESUELTO** e integrado en #122 (`52eaec0`).

### H-SPEC03-03 — Fallo de fuente no contractual (técnico)

**Clasificación:** SPEC correcta, implementación incompleta. `movementSource()`
devolvía `pendiente`/`disponible`, sin `error`, y no capturaba excepciones, a
diferencia de `revisionComidaSource()`. Una consulta fallida (esquema parcial) producía
500 y rompía listado/ficha/contexto, incumpliendo el contrato y «el error de referencia
no borra el catálogo».

**Corrección:** `movement-ledger.ts` devuelve `{ state: "error" }` al fallar la
consulta; prueba focal en `ciclos.test.ts` (FAIL antes / PASS después). Sin cambios de
fórmula, calendario, esquema, migraciones ni UI.

**Límite:** la corrección restablece la referencia contractual, pero no garantiza que
todos los consumidores recuperen disponibilidad. `monthlyFlow()` y otras rutas siguen
consultando el ledger con `ledgerRows()` directamente; no se amplía esa cobertura sin
autorización nueva. La comprobación de instalación (`ledgerInstalled()`) queda fuera
del `try`, igual que en `revisionComidaSource()`, por lo que un fallo al leer
`schema_version` sigue siendo un error de base de datos, no de fuente.

**Estado: RESUELTO** e integrado en #122 (`52eaec0`).

**Evidencia:** prueba focal FAIL antes / PASS después; CI Linux `critical`
`40760689632` sobre `7483709`: 298 pruebas API PASS (incluida la focal), sin
Playwright; CI posterior de `main` `40761769656` (fast): PASS.

## Evidencias de la auditoría

| Fecha | SPEC | PR | HEAD | CI | Validación de Álex | Merge |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-28 | — | — | `63ee1d0` | — | Inventario verificado | — |
| 2026-10-28 | 01 | [#115](https://github.com/jmartinlabs/myfinanzas-app/pull/115) | `b307c9c` validado / merge `e4a26de` | `40726975597` PR / `40728150624` main PASS | APROBADA | Integrada |
| 2026-10-28 | 02 | [#117](https://github.com/jmartinlabs/myfinanzas-app/pull/117) | `85c00f1` validado / merge `13cc7c6` | `40734932828` PR / `40737846233` main PASS | APROBADA | Integrada |
| 2026-10-28 | 02 | [#119](https://github.com/jmartinlabs/myfinanzas-app/pull/119) | `6440592` validado / merge `da93682` | `40747193480` PR / `40747195074` full / `40748880562` main PASS | APROBADA | Integrada |
| 2026-10-28 | 03 | [#122](https://github.com/jmartinlabs/myfinanzas-app/pull/122) | `7483709` validado / merge `52eaec0` | `40760689632` critical PASS (298 API; focal H-SPEC03-03) / `40761769656` main fast PASS | APROBADA | Integrada |

## Próxima acción

1. **SPEC01, SPEC02 y SPEC03 CERRADAS** e integradas en `main`; sin acción pendiente
   sobre ellas.
2. **Auditoría global autorizada:** Álex inicia la revisión en rondas sobre las 22
   SPEC restantes. Hallazgos y evidencias se consolidan aquí; no iniciar correcciones.
3. No alterar la evidencia histórica de SPEC01–03. Requerir autorización expresa
   para todo cambio funcional/documental en las SPEC y para cualquier merge.

`main` al cierre histórico de SPEC03: `52eaec0` (squash de PR #122); segunda pasada sobre `1ed2a83`. Históricos: `7483709` (HEAD validado de
#122), `3d87511` (#120), `5d8f273` (#121), `da93682` (#119), `13cc7c6` (#117), `71866ac`
(#116) y `e4a26de` (#115). El gap de cero explícito + movimientos de SPEC01 permanece
registrado y no bloqueante.
