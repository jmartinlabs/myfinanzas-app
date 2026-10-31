# E3.5 / FIN_NETA — análisis de adaptación al registro único de Comida

Fecha: 2026-10-31. Autor: orquestador OpenCode. Estado: **análisis documental**.
No implementa DEV, no define fórmulas nuevas, no usa datos reales y no autoriza
migración, activación ni cierre. No reabre DEV18.

Contexto: [roadmap E3.5](../roadmap.md#e35--comida-por-ciclo-y-compensaciones),
[SPEC16](../16-revision-comida-specification.md),
[SPEC21](../21-pendientes-conciliacion-specification.md),
[referencia funcional](../functional-reference-v5.11.md).

## 1. Objetivo

Analizar cómo debe adaptarse E3.5/FIN_NETA al modelo vigente de **registro único de
Comida en Movimientos**, sin crear un segundo ledger, sin reconstruir FIN_NETA por
inferencia y sin duplicar gastos, devoluciones, financiación o reposiciones.

Este documento separa:

- lo que ya existe y está aprobado;
- lo que E3.5 necesita consumir;
- los huecos y decisiones pendientes;
- las opciones de adaptación, sin elegir una por el usuario.

## 2. Lo que ya existe

### 2.1 Registro único de Comida

- Movimientos centrales con tipo explícito `Devolución de gasto`; no hay un segundo
  gasto en Revisión Comida.
- `movimiento_revision_comida`: etiqueta analítica (`Comida`, `Pendiente revisar`,
  `Ocio`, `Niños`, `Otros`, `Fuera presupuesto`), evidencias y estado de revisión.
- `movimiento_devolucion`: vínculo devolución–compra, partida, ciclo de origen,
  elegibilidad y estado.
- `movimiento_rol_financiacion`: rol explícito **Financiación**, **Reposición** o
  **Devolución Anticipo**; la reposición exige `obligacion_ciclo`.
- `regimen_comida`: régimen fechado, corte, apertura, evidencia y cobertura.
- `movimiento_anticipo`: rol **Adelanto** o **Devolución** con referencia y evidencia.
- `comidaMetrics()` ya calcula, de forma condicional, `financing.f`, `resources`,
  `analyticsClose`, `bridge` y `position` cuando el régimen y la cobertura lo permiten.
  No es el motor E3.5 completo: faltan regímenes/cobertura, consumidores y contrato
  definitivo. DEV18 anterior sigue STOP.

### 2.2 Fórmulas ya aprobadas

SPEC16 P7 aprueba el contrato analítico, no una implementación:

- `Recursos = S0 + F + R_caja − C_n`.
- `Falta por reponer = max(C_n − R_obl, 0)`.
- `J_n` = Comida/Pendiente revisar neto elegible.
- `C_n` = Compensable neto elegible (Ocio + Niños + Otros).
- `D` = todos los Movimientos vigentes que afectan ING Comida en `[A,T]`.
- `Cierre analítico = S0 + D`.
- `Base analítica = Recursos − J_n`.
- `Otros efectos = D − (F + R_caja − C_n − J_n)`.

Este análisis **no cambia** esas fórmulas ni sus significados. Solo identifica de qué
fuente actual puede obtenerse cada entrada.

## 3. Mapeo de entradas E3.5 a datos vigentes

| Entrada | Fuente actual propuesta | Estado / hueco |
| --- | --- | --- |
| `S0` | `ciclos.saldo_comida` | Manual; ausente no es 0 |
| `F` / FIN_NETA | `movimiento_rol_financiacion` con rol `Financiación`, menos `Devolución Anticipo` en `[A,T]` | Requiere confirmar equivalencia FIN_NETA ↔ F y cobertura de roles |
| `R_caja` | Movimientos con rol `Reposición` cobrados en ING en `[A,T]` | Requiere distinguir cobro actual de obligación asignada |
| `R_obl` | Rol `Reposición` con `obligacion_ciclo` del ciclo | Requiere confirmar asignación y no sumar R_caja + R_obl |
| `C_n` | Etiquetas `Ocio`/`Niños`/`Otros` menos devoluciones elegibles de esas compras | Requiere cubrir compras sin vínculo y devoluciones de otro ciclo |
| `J_n` | Etiquetas `Comida`/`Pendiente revisar` menos devoluciones elegibles | Requiere cobertura y neto observado separado |
| `D` | Todos los Movimientos vigentes de ING en `[A,T]`, incluidos `Fuera presupuesto` | No sumar auxiliar legado ni duplicar devoluciones |
| `B_A` / `B` | Régimen/apertura y Movimientos desde el corte | Solo con cobertura; no copiar a S0 |
| `FIN_NETA` | No se almacena como cifra propia; `comidaMetrics()` calcula `F` condicionalmente | No reconstruir por inferencia; debe salir de F o de un proveedor explícito |

**Equivalencia propuesta, a confirmar:** `FIN_NETA` es la financiación ya neta de la
devolución de Anticipo; en P7 corresponde a `F`. Si el usuario o una spec posterior
definen otra fuente, prevalece esa definición.

## 4. Invariantes que la adaptación debe conservar

1. **Un solo hecho económico:** Comida no crea un segundo Gasto; Revisión Comida es
   capa analítica sobre Movimientos.
2. **Devolución de Anticipo una sola vez:** si está dentro de F/FIN_NETA, no se resta
   otra vez de Recursos ni se vuelve a descontar como Devolución de gasto.
3. **Devolución comercial no es Ingreso:** reduce J_n/C_n solo con elegibilidad y
   vínculo; no se suma como entrada ordinaria.
4. **Comida no se resta de Recursos:** J_n es consumo; Recursos usa F, R_caja y C_n.
5. **Reposición no es financiación:** R_caja y R_obl no se suman entre sí; una es caja
   y otra obligación asignada.
6. **Fuera presupuesto:** afecta al banco/D, pero no a C_n ni al análisis presupuestario.
7. **Agregado legado vs detalle:** no sumar ambos; si no hay cobertura, parcial/no
   disponible, nunca 0.
8. **Ciclo y fecha:** usar Ciclos y fecha real; una devolución antigua no reduce la
   obligación actual.
9. **Faltante ≠ 0:** sin S0, B, cobertura o rol, la métrica afectada es no disponible.

## 5. Huecos y decisiones pendientes

1. **Fuente de FIN_NETA:** SPEC16 P7 ya fija `F` como financiación ordinaria menos
   Devolución Anticipo, con rol explícito. La opción A es la recomendada para revisión;
   no es una decisión nueva aprobada ni autoriza DEV. No se acepta inferir por nombre,
   importe o fecha.
2. **Rol de cada Transferencia:** ¿qué hacer si una transferencia de ING no tiene rol
   declarado? Cobertura parcial/no disponible, no asignación silenciosa.
3. **Doble vínculo Anticipo:** coherencia semántica, no igualdad literal.
   `movimiento_anticipo` es la atribución canónica al Anticipo (Referencia, par y
   orientación). `movimiento_rol_financiacion` aporta la función analítica de Comida;
   no tiene Referencia ni el mismo vocabulario (`Devolución` frente a
   `Devolución Anticipo`). Para el mismo ID de Movimiento se exige: atribución de
   Anticipo acreditada, Transferencia real saliente elegible de ING, función
   `Devolución Anticipo` compatible, revisión y evidencias vigentes, y **una sola
   deducción**. Los conflictos se tratan como cobertura parcial/no disponible y su
   contrato se especifica antes de DEV. No añadir FKs ni columnas sin permiso.
4. **Reposiciones:** confirmar que `obligacion_ciclo` identifica la obligación y que
   R_caja/R_obl no se suman; qué pasa con reposiciones sin asignación.
5. **Compensable:** confirmar que solo Ocio/Niños/Otros entran en C_n y que
   `Fuera presupuesto` queda fuera aunque afecte al banco.
6. **Devoluciones:** qué vínculo mínimo acredita elegibilidad; qué ocurre con compras
   agregadas de Terminal, devoluciones sin compra y devoluciones de otro ciclo.
7. **Cobertura histórica:** qué intervalo y fuentes se consideran completos; cómo se
   representa el legado sin reconstruir FIN_NETA.
8. **S0/B/C:** confirmar que C y B son los de P3 y que S0 sigue siendo manual; no
   arrastrar S0 ni convertir B en S0.
9. **Ubicación normativa:** ¿enmienda de SPEC16 o nueva SPEC18? No se crea una spec
   nueva sin aprobación; este documento no decide.

## 6. Opciones de adaptación

### Opción A — capa analítica de solo lectura sobre lo vigente

E3.5 consume Movimientos, metadatos, devoluciones y roles explícitos; calcula F,
R_caja, R_obl, C_n, J_n, D y cobertura. No crea tablas de hechos ni un segundo ledger.

- **Recomendada por el auditor para revisión**, no aprobada ni autorizada para DEV.
- Ventaja: conserva el registro único y evita duplicación; `comidaMetrics()` ya tiene
  una base parcial de P7.
- Límite: depende de que los roles y vínculos estén completos; sin ellos, parcial.

### Opción B — proveedor explícito de FIN_NETA

Un proveedor autorizado entrega FIN_NETA ya neta, con evidencia y cobertura; E3.5 no
la reconstruye desde brutos.

- Ventaja: separa la financiación de la agregación.
- Límite: exige definir el proveedor y su contrato; no existe hoy.

### Opción C — agregados persistidos

Persistir totales o una posición paralela.

- No recomendada: duplica verdad, complica cierres y contradice el registro único.
- Solo tendría sentido con una spec y autorización explícitas.

## 7. Riesgo técnico observado (fuera de alcance)

En `apps/api/src/comida.ts` (~1390–1409 en `main` `2019fea`), `missing` detecta
Transferencias sin rol, pero después se usa `roles.get(r.id)!` y se evalúa `role.rol`.
Una Transferencia sin rol podría provocar una excepción en lugar de devolver cobertura
`Parcial`/`No disponible`. Es **inspección estática, no bug reproducido**. Requiere
test de regresión y corrección separada, solo con autorización de DEV; no se introduce
código en la PR documental.

## 8. Evidencia mínima antes de DEV

- Casos P7/CU-21/CU-22 con S0, F, R_caja/R_obl, C_n, J_n, D y puente.
- Devolución de Anticipo una sola vez, con doble vínculo controlado.
- Devolución comercial actual, antigua y sin compra.
- Reposición cobrada y asignada a obligación actual/antigua.
- Agregado Terminal vs detalle individual sin doble cómputo.
- `Fuera presupuesto` afecta banco pero no C_n.
- Falta S0, B o cobertura → no disponible, nunca 0.
- Ciclo abierto, sin siguiente Inicio y cruce de ciclos.

Sin datos reales; fixtures sintéticas y autorización de DEV separada.

## 9. Siguiente paso

Confirmar las decisiones del apartado 5, especialmente la fuente de FIN_NETA y el
tratamiento del doble vínculo de Anticipo. Después podrá proponerse una enmienda
documental o una spec E3.5 y, solo con autorización separada, su DEV.

Este análisis no cierra E3.5, no desbloquea E4.9 y no sustituye la evidencia DT6.
