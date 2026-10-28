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
| 07 | Operación de Ciclos | Pendiente | — | — | — | — | — | — |
| 08 | Presupuestos | Pendiente | — | — | — | — | — | — |
| 09 | Plan del ciclo | Pendiente | — | — | — | — | — | — |
| 10 | Plan anual | Pendiente | — | — | — | — | — | — |
| 11 | Nómina y previsión | Pendiente | — | — | — | — | — | — |
| 12 | Flujo mensual | Pendiente | — | — | — | — | — | — |
| 13 | Anticipos | Pendiente | — | — | — | — | — | — |
| 14 | Gastos compartidos | Pendiente | — | — | — | — | — | — |
| 15 | Vehículos e ITV | Pendiente | — | — | — | — | — | — |
| 16 | Revisión Comida | Pendiente | — | — | — | — | — | — |
| 17 | Deuda completa | Pendiente | Sin `progress`; verificar en la revisión. | — | — | — | — | Documentación incompleta. |
| 19 | Instrumentos y Compras de inversión | Pendiente | — | — | — | — | — | — |
| 20 | Histórico precontrol | Pendiente | — | — | — | — | — | — |
| 21 | Pendientes y conciliación | Pendiente | — | — | — | — | — | — |
| 22 | Ventas y posición de bróker | Pendiente | Wireframes y capturas asociadas. | — | — | — | — | — |
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
