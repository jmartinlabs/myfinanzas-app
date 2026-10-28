# Auditoría secuencial de especificaciones — Registro único

**Status: ABIERTA — 2026-10-28.** Registro de la auditoría documental; no es un tablero
de desarrollo. Estado funcional global: [epic-board](../epic-board.md).

- Base verificada: `main` `63ee1d0`.
- Alcance: las 25 SPEC del inventario autorizado; sin código, datos, Excel ni funcionalidad.
- Estado inicial: **SPEC01 revisada por Álex, pendiente de correcciones**; las otras 24,
  pendientes.
- Ninguna SPEC se ha modificado todavía. Este fichero es el único cambio de esta entrada.

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
| 01 | Saldos y atributos de control | Corrección en curso | Estado PR #6→PR #7; brainstorming `IN REVIEW`; testplan PASS vs contratos; progress con siguiente paso; refs DT4/DT5/E4.8, DDL/DT6/DT1 históricos; cierres sin runtime. Sin contradicción funcional. | 4 docs SPEC01 + tracker | Conservar todo; sin eliminaciones; posibles simplificaciones históricas futuras con justificación. | — | — | Requiere validación de Álex sobre el HEAD final. |
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

## Evidencias de la auditoría

| Fecha | SPEC | PR | HEAD | CI | Validación de Álex | Merge |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-28 | — | — | `63ee1d0` | — | Inventario verificado | — |

## Próxima acción

1. Esperar el mensaje de Álex con las correcciones concretas de **SPEC01**.
2. Aplicar únicamente ese alcance, verificar y publicar la PR documental.
3. Actualizar este registro en la misma PR.
4. Validación de Álex sobre el HEAD final y autorización expresa de merge.
5. Tras integración y verificación, marcar SPEC01 como `Cerrada` y solo entonces iniciar
   SPEC02.

**No se inicia ninguna corrección de SPEC01 hasta recibir el mensaje específico de Álex.**
