# Auditoría secuencial de especificaciones — Registro único

**Status: ABIERTA — 2026-10-28.** Registro de la auditoría documental; no es un tablero
de desarrollo. Estado funcional global: [epic-board](../epic-board.md).

- Base del inventario: `main` `63ee1d0`.
- Alcance: las 25 SPEC del inventario autorizado; sin código, datos, Excel ni funcionalidad.
- **Estado actual:** SPEC01 corregida y publicada en
  [PR #115](https://github.com/jmartinlabs/myfinanzas-app/pull/115); auditoría de
  coherencia con código realizada con **H-SPEC01-01 abierto**; validación final
  pendiente. Las otras 24 SPEC siguen pendientes.
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
| 01 | Saldos y atributos de control | PR pendiente · coherencia abierta | Correcciones documentales aplicadas. **H-SPEC01-01 abierto:** la posición calculada trata la apertura ausente como 0 (`positionCents`/`cashAt`; tests lo fijan), mientras la SPEC exige ausencia ≠ cero. Sin cambio de código en #115. | 4 docs SPEC01 + tracker | Conservar todo; sin eliminaciones; posibles simplificaciones históricas futuras con justificación. | [#115](https://github.com/jmartinlabs/myfinanzas-app/pull/115) / HEAD final / CI de la PR; candidato revisado `c59834f` | Pendiente | H-SPEC01-01 requiere decisión; AC-38 parcial y E1.3 no acreditado. |
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
| Dinero exacto, fechas y límites | `money`, `decimal`, validación | AC-13/29/33 | Coincide en almacenamiento; ver H-SPEC01-01 en derivados |
| Saldo actual Movimientos | `positionCents`; `GET /api/saldos`; UI | AC-30; `app.test.ts` | **H-SPEC01-01** |
| Inversiones/Efectivo | `cashAt`; E4.1; UI | `compras.test.ts` | **H-SPEC01-01**; E4.2/E4.3 delimitados |
| Acceso/API/CSRF/idempotencia | `app.ts`, sesión y pruebas | AC-18/20/23 | Coincide |
| UI, switches y estados | `Saldos.tsx`, `SaldoForm.tsx`, Playwright | AC-22/28/37/42/43 | Coincide; capturas históricas |
| Backup/restauración | `backup.ts`; pruebas age | AC-24/25/26 | Coincide en local; destino externo DT6 abierto |
| Protección de cierres | Sin `api/cierres` ni tablas de cierre | `grep` en `apps/api/src`; SPEC26/27 | Sin runtime; delimitado, no contradicción |
| Cabecera E1.3 | `CycleHeader` | Sin AC de E1.1 | Integrada después; no acreditada por pruebas E1.1 |

### H-SPEC01-01 — Apertura ausente tratada como 0 en la posición calculada

- **Regla documentada:** la ausencia de apertura no es cero; el importe no calculable es
  `null`/`No disponible` y no se muestra un cero ficticio. Ver la specification de E1.1
  («Saldo actual», «M1» y «Reservas financieras»).
- **Código:** `apps/api/src/movement-ledger.ts:42` usa `opening ?? "0"`;
  `apps/api/src/investment-engine.ts:209` usa `saldo.apertura ?? "0"`;
  `apps/api/src/saldos.ts:150-166` expone esos cálculos en `posicion`.
- **Pruebas que fijan el comportamiento actual:** `apps/api/src/app.test.ts:206-209`
  espera `saldoApertura ?? "0.00"` para Movimientos y `0.00` para Efectivo/Inversiones;
  `apps/api/src/compras.test.ts:196` espera `0.00` para S001. El seed de S001
  (`database-schema.ts:185-205`) tiene apertura `null`.
- **Consumidores:** `GET /api/saldos`, listado/ficha de `Saldos.tsx`, agregados de
  liquidez y futuras fotos de cierre que consuman la posición.
- **Impacto financiero:** un Saldo sin apertura puede mostrar `0.00` o una posición
  derivada de solo Movimientos/Compras, ocultando que falta la apertura. Puede alterar
  liquidez agregada y la foto de un cierre futuro.
- **Clasificación:** **SPEC correcta y código/tests discrepantes** (sujeto a confirmar
  que «ausencia ≠ cero» cubre también la posición derivada). No se propone cambiar la
  regla financiera para acomodar el código.
- **Propuesta, sin ejecutar:** (A) alinear código y pruebas con la SPEC: posición
  `null`/`No disponible` cuando la apertura aplicable está ausente, salvo regla expresa
  de cero neutral; (B) si se confirma el cero neutral, enmendar SPEC/AC con aprobación
  financiera explícita; (C) exigir apertura, que contradice M1 y no se recomienda.
- **Estado:** **ABIERTO.** No se corrige en PR #115; requiere decisión de Álex/usuario y
  una PR funcional separada. SPEC01 no se declara `Cerrada` mientras siga abierto.

**Dependencias futuras delimitadas:** E4.2 Ventas, E4.3 valoración/patrimonio, DT6
externo y cierres E4.8/E4.9 no tienen runtime; no se exige desarrollarlos para cerrar
esta auditoría. E1.3 está integrado, pero no queda acreditado por las pruebas E1.1.

## Evidencias de la auditoría

| Fecha | SPEC | PR | HEAD | CI | Validación de Álex | Merge |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-28 | — | — | `63ee1d0` | — | Inventario verificado | — |
| 2026-10-28 | 01 | [#115](https://github.com/jmartinlabs/myfinanzas-app/pull/115) | `c59834f` + precisiones; ver HEAD final | ver checks de la PR | Pendiente (H-SPEC01-01 abierto) | Pendiente |

## Próxima acción

1. Álex y el usuario deciden **H-SPEC01-01**. Cualquier cambio de código exige
   autorización específica y una **PR funcional separada**; no se toca PR #115.
2. Validar el **HEAD final** de [PR #115](https://github.com/jmartinlabs/myfinanzas-app/pull/115).
3. Autorizar el merge documental cuando corresponda.
4. Marcar SPEC01 como `Cerrada` solo con H-SPEC01-01 resuelto, validación e integración
   completas.
5. Solo entonces iniciar SPEC02.

No hay correcciones documentales pendientes de recibir. H-SPEC01-01 es una decisión de
coherencia documentación↔código, no una corrección automática.
