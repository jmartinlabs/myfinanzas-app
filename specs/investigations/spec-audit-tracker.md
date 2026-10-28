# Auditoría integral de especificaciones — Registro único

**Status: ABIERTA — 2026-10-28.** Registro de la auditoría documental; no es un tablero
de desarrollo. Estado funcional global: [epic-board](../epic-board.md).

- Base del inventario: `main` `63ee1d0`. `main` actual: `52eaec0` (squash de PR #122); históricos: `3d87511` (#120), `5d8f273` (#121), `da93682` (#119), `13cc7c6` (#117), `71866ac` (#116) y `e4a26de` (#115).
- Alcance: las 25 SPEC del inventario autorizado. La auditoría es documental; cualquier
  corrección funcional requiere autorización específica (H-SPEC03-03 es la única
  aprobada en esta ronda).
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
| 04 | Movimientos | En inspección (no cerrada) | H-SPEC04-01 documental menor; H-SPEC04-02 técnico, vista previa de referencia posterior no agrega fuente Comida (reproducción pendiente). | Spec/brainstorming 04; `movimientos.ts`, `ciclos.ts`, `Movimientos.tsx`, tests. | Conservar historial; no corregir sin aprobación. | PR #15 `b51b89b` integrada; contraste en `main` `5570d89`. | 2026-10-28 · inspección Álex, sin cierre. | Medio: posible indicador de impacto temporal engañoso; motor central no afectado. |
| 05 | Transferencias y Referencias | En inspección (no cerrada) | H-SPEC05-01 documental: vigencia de excepción D5/Exterior desfasada respecto a integración #90; AC futuros no reclasificados. | Spec05 §D5 y sección Transferencias; progreso D5 spec14 y código `aportaciones.ts`. | Conservar historia y aprobaciones. | PR #84 `2487656` y #90 `cf6954a` MERGED; contraste en `main` `5570d89`. | 2026-10-28 · inspección Álex, sin cierre. | Bajo/medio: ambigüedad de capacidad actual; sin fallo económico demostrado. |
| 06 | Deuda | Pendiente (primera pasada) | H-SPEC06-01 documental provisional: cabecera de progreso y plan histórico de dev aún expresan no integrado; falta auditoría técnica completa. | Progreso y spec 06; servicios/pruebas en inspección. | Conservar el historial. | PR #34 `cb9ba3b` MERGED, contrastada. | 2026-10-28 · primera pasada de Álex, sin cierre. | Bajo: estado aparente desactualizado; sin impacto financiero demostrado. |
| 07 | Operación de Ciclos | En inspección (no cerrada) | H-TRANS-01: vigencia documental desactualizada tras merge funcional; coherencia transversal en evaluación. | `specs/07-*` y consumidores API. | Conservar histórica; nota de estado actual, sin reescribir evidencia. | PR #49 MERGED `1cdbc7c` (verificado). | 2026-10-28 · ronda documental + contraste parcial Álex; sin cierre. | Documental menor; contratos futuros/test gates requieren verificación específica. |
| 08 | Presupuestos | En inspección (no cerrada) | H-TRANS-01: vigencia documental desactualizada tras merge funcional; coherencia transversal en evaluación. | `specs/08-*` y consumidores API. | Conservar histórica; nota de estado actual, sin reescribir evidencia. | PR #44 MERGED `255bf61` (verificado). | 2026-10-28 · ronda documental + contraste parcial Álex; sin cierre. | Documental menor; contratos futuros/test gates requieren verificación específica. |
| 09 | Plan del ciclo | En inspección (no cerrada) | H-TRANS-01: vigencia documental desactualizada tras merge funcional; coherencia transversal en evaluación. | `specs/09-*` y consumidores API. | Conservar histórica; nota de estado actual, sin reescribir evidencia. | PR #57 MERGED `7422d23` (verificado). | 2026-10-28 · ronda documental + contraste parcial Álex; sin cierre. | Documental menor; contratos futuros/test gates requieren verificación específica. |
| 10 | Plan anual | En inspección (no cerrada) | H-TRANS-01: vigencia documental desactualizada tras merge funcional; coherencia transversal en evaluación. | `specs/10-*` y consumidores API. | Conservar histórica; nota de estado actual, sin reescribir evidencia. | PR #61 MERGED `e1d6dba` (verificado). | 2026-10-28 · ronda documental + contraste parcial Álex; sin cierre. | Documental menor; contratos futuros/test gates requieren verificación específica. |
| 11 | Nómina y previsión | En inspección (no cerrada) | Sin hallazgo nuevo en primera lectura: estado integrado bien identificado, N:M y proyección separadas; pendientes pruebas transversales y contraste de reglas. | SPEC 11, servicios API y matrices de aceptación. | Conservar historial y límites. | PR #63 `ed4a272` integrada. | 2026-10-28 · contraste documental/código parcial; sin cierre. | Validación integrada y cobertura transversal aún por comprobar. |
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
| 26 | Precierre | Pendiente | Sin `progress`; verificar en la revisión. | — | — | — | — | Documentación incompleta. |
| 27 | Cierre financiero | Pendiente | Sin `progress`; verificar en la revisión. | — | — | — | — | Documentación incompleta. |
| 31 | SQLite producción | Pendiente | Incluye `enmienda-01`; verificar vigencia. | — | — | — | — | — |
| 32 | Ejecución rootless | Pendiente | Sin `testplan` ni `progress`; verificar en la revisión. | — | — | — | — | Documentación incompleta. |

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
naturaleza; inicialmente observado en SPEC07–10 y ampliado a SPEC13–16 y SPEC19.
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

`main` actual: `52eaec0` (squash de PR #122). Históricos: `7483709` (HEAD validado de
#122), `3d87511` (#120), `5d8f273` (#121), `da93682` (#119), `13cc7c6` (#117), `71866ac`
(#116) y `e4a26de` (#115). El gap de cero explícito + movimientos de SPEC01 permanece
registrado y no bloqueante.
