# Auditoría secuencial de especificaciones — Registro único

**Status: ABIERTA — 2026-10-28.** Registro de la auditoría documental; no es un tablero
de desarrollo. Estado funcional global: [epic-board](../epic-board.md).

- Base del inventario: `main` `63ee1d0`.
- Alcance: las 25 SPEC del inventario autorizado; sin código, datos, Excel ni funcionalidad.
- **Estado actual:** SPEC01 corregida y publicada en
  [PR #115](https://github.com/jmartinlabs/myfinanzas-app/pull/115); **H-SPEC01-01
  resuelto** por decisión expresa del usuario; validación final y merge pendientes.
  Las otras 24 SPEC siguen pendientes.
- **Historial inicial:** SPEC01 fue revisada por Álex y quedó pendiente de correcciones
  antes de la PR #115. Se conserva solo como antecedente.
- SPEC01 es la única SPEC modificada; el resto no se ha tocado.

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
| 01 | Saldos y atributos de control | PR pendiente | Correcciones documentales aplicadas. **H-SPEC01-01 resuelto** por decisión expresa (2026-10-28): `null` se conserva y se usa 0 neutral en el cálculo del Saldo actual. Cobertura de tests revisada; gap de cero explícito + movimientos registrado. Sin cambio de código. | 4 docs SPEC01 + tracker | Conservar todo; sin eliminaciones; posibles simplificaciones históricas futuras con justificación. | [#115](https://github.com/jmartinlabs/myfinanzas-app/pull/115) / HEAD final / CI de la PR; candidato revisado `c59834f` | Pendiente | AC-38 parcial y E1.3 no acreditado; sin contradicción material abierta. |
| 02 | Clasificación | Pendiente | — | — | — | — | — | — |
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

## Evidencias de la auditoría

| Fecha | SPEC | PR | HEAD | CI | Validación de Álex | Merge |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-28 | — | — | `63ee1d0` | — | Inventario verificado | — |
| 2026-10-28 | 01 | [#115](https://github.com/jmartinlabs/myfinanzas-app/pull/115) | `c59834f` + precisiones + decisión H-01; ver HEAD final | ver checks de la PR | Pendiente | Pendiente |

## Próxima acción

1. Álex valida el **HEAD final** de [PR #115](https://github.com/jmartinlabs/myfinanzas-app/pull/115).
2. El usuario autoriza expresamente el merge documental.
3. Tras la integración, verificar el SHA real y marcar SPEC01 como `Cerrada` si no hay
   otras contradicciones.
4. Solo entonces iniciar SPEC02.

H-SPEC01-01 está resuelto. No hay cambios de código en #115; el gap de cero explícito +
movimientos queda registrado para una PR de pruebas autorizada.
