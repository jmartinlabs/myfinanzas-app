# Auditoría secuencial de especificaciones — Registro único

**Status: ABIERTA — 2026-10-28.** Registro de la auditoría documental; no es un tablero
de desarrollo. Estado funcional global: [epic-board](../epic-board.md).

- Base del inventario: `main` `63ee1d0`. `main` actual: `71866ac` (cierre SPEC01 y tracker #116); `e4a26de` fue el merge de PR #115.
- Alcance: las 25 SPEC del inventario autorizado; sin código, datos, Excel ni funcionalidad.
- **Estado actual:** **SPEC01 CERRADA** — [PR #115](https://github.com/jmartinlabs/myfinanzas-app/pull/115)
  integrada por squash `e4a26de`; validación de Álex sobre `b307c9c`; CI post-merge
  `40728150624` SUCCESS. **SPEC02 revisada por Álex**; correcciones documentales en
  curso y **H-SPEC02-01 (Funcional) abierto**. Las otras 23 SPEC siguen pendientes.
- **Historial inicial:** SPEC01 fue revisada por Álex y quedó pendiente de correcciones
  antes de la PR #115. Se conserva solo como antecedente.
- SPEC01 y SPEC02 son las SPEC modificadas; las otras 23 no se han tocado.

## Reglas de la auditoría

- Se revisa **una SPEC cada vez**; no se inicia la siguiente sin cierre de la anterior.
- Álex identifica hallazgos y aprueba funcionalmente; OpenCode aplica solo el alcance
  autorizado, verifica, publica la PR y actualiza este registro.
- **Ningún merge sin autorización expresa** del usuario.
- No se reabren decisiones financieras aprobadas sin contradicción demostrada.
- No se elimina ni archiva ningún archivo automáticamente.
- Las actualizaciones de estado pueden incorporarse a la PR de la SPEC para evitar PR
  auxiliares.
- Este registro no duplica el estado funcional general de [epic-board](../epic-board.md).

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
| 02 | Clasificación | Revisada por Álex · PR pendiente | D1 estados históricos; D2 AC-19/24/25/26 sin reclasificar; D3 rectificación y Partida→Deuda; D4 cobertura real de impacto. **H-SPEC02-01 (Funcional) abierto**: transparencia de cobertura. | 4 docs SPEC02 + tracker | Conservar todo; sin eliminaciones. | [#117](https://github.com/jmartinlabs/myfinanzas-app/pull/117) / `6163e5f` / CI `40732604479` PASS; HEAD final en checks | — | H-SPEC02-01 requiere propuesta funcional separada; no cerrar SPEC02. |
| 03 | Ciclos financiados | Pendiente | — | — | — | — | — | — |
| 04 | Movimientos | Pendiente | — | — | — | — | — | — |
| 05 | Transferencias y Referencias | Pendiente | — | — | — | — | — | — |
| 06 | Deuda | Pendiente | — | — | — | — | — | — |
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

### H-SPEC02-01 — Funcional · Propuesta técnica mínima (sin implementar)
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
- **Estado:** abierto (Funcional); requiere autorización específica y PR funcional separada.

## Evidencias de la auditoría

| Fecha | SPEC | PR | HEAD | CI | Validación de Álex | Merge |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-28 | — | — | `63ee1d0` | — | Inventario verificado | — |
| 2026-10-28 | 01 | [#115](https://github.com/jmartinlabs/myfinanzas-app/pull/115) | `b307c9c` validado / merge `e4a26de` | `40726975597` PR / `40728150624` main PASS | APROBADA | Integrada |
| 2026-10-28 | 02 | [#117](https://github.com/jmartinlabs/myfinanzas-app/pull/117) | `main` `71866ac`; históricos `6163e5f`, `7d76fe1`; HEAD final en checks | `40732604479` / `40732906872` PASS; HEAD final pendiente | Pendiente | Pendiente |

## Próxima acción

1. PR #117 documental preparada; validar su **HEAD/CI final** y presentarla a Álex.
   Merge pendiente de autorización expresa.
2. **H-SPEC02-01 (Funcional)** sigue abierto: propuesta técnica registrada; no implementar
   sin autorización específica ni PR funcional separada.
3. **No cerrar SPEC02** hasta resolver H-SPEC02-01 o aceptarlo expresamente.
4. **No iniciar SPEC03.**

`main` actual: `71866ac`. Históricos de la PR #117: `6163e5f` (documentación) y `7d76fe1`
(tracker); el HEAD final se consulta en los checks de la PR. El gap de cero explícito +
movimientos de SPEC01 permanece registrado y no bloqueante.
