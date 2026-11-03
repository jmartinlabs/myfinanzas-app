# E4.7 — Inventario anual de fuentes y fronteras (decisión)

**Fecha:** 2026-11-03 · **Base:** `main` `8b5cf5c` · **Estado:** inventario documental.
**Sin SPEC25, sin DEV25, sin PASS.** `[CONFIRMADO]` = regla aprobada; `[PROPUESTA]` =
criterio propuesto; `[PENDIENTE]` = decisión del usuario.

## 1. Fuentes y motores

| Motor | Estado | Límite para E4.7 |
|---|---|---|
| **E2.4** Plan anual | Integrado; `annualEquivalent`/`annualExecution` (`apps/api/src/plan-anual.ts:97-259`). | Proveedor por defecto `unavailable` (`:49-56`): sin histórico/control, Ejecutado anual parcial/null. |
| **E2.6** Flujo mensual | Integrado; `monthlyFlow` (`flujo-mensual.ts:469`), `margenReal`/`margenEstructural` (`:649-673`), ajuste compartido (`:751-806`). | Solo por Ciclo; no agrega año natural ni ingresos anuales. |
| **E3.6** Pendientes | Integrado DEV21/PR #180; `pendientes.ts:1275`; sin total económico (`:138-143`). | Comida/E3.5 no disponible; `flujoBase` solo por Ciclo. |
| **E4.4** Deuda completa | Integrado DEV17/PR #176 (`deuda-completa.ts:584,601`). | Solo si E4.7 incluye bloque patrimonial/deuda. |
| **E4.5 / DT7** Archivo | Spec aprobada, **sin DEV**; DT7 abierto (`specs/20-historico-precontrol-specification.md:3-6`). Solo Gastos (Q2=A, `:286-289`). | Total anual solo con cobertura completa y universo DT7 (`:257-271,294-304`); sin ingresos históricos. |
| **E4.6** Inicio | **DRAFT no aprobada**, PR #179 OPEN, Q1–Q12 abiertas (`specs/24-e46-resumen-inicio-specification.md:3,625-630`). | No compara años ni consume archivo (`:72`); contrato no estable. |
| **E4.3** Valoración | Spec aprobada, **sin DEV** (`specs/23-e43-valoracion-resultados-specification.md:3-12,38-40`). | Bloquea patrimonio/valoración; no el flujo anual básico. |
| **E4.9/E4.11** Cierre/fotos | Aprobadas, sin DEV; DT6 abierto (`specs/27-e49-cierre-financiero-specification.md:3-8`). | **Downstream** de E4.7 (`roadmap.md:376,387`); solo bloquean un cierre anual inmutable. |

## 2. Fronteras

- **Ejercicio natural vs Ciclo** `[CONFIRMADO]`: año = fecha civil del hecho; Ciclo = ventana de `tblCiclos`, puede cruzar diciembre/enero. Se muestran ambos sin reasignar (`specs/21-pendientes-conciliacion-specification.md:377-396`; `specs/20-historico-precontrol-specification.md:433-448`).
- **Plan / previsión / realidad / archivo** `[CONFIRMADO]`: E2.4/E2.3 plan; E2.5 previsión (no crea hechos); Movimientos realidad; E4.5 archivo solo Gastos (`specs/11-nomina-prevision-specification.md:17-20`; `specs/12-flujo-mensual-specification.md:87-105`).
- **Una fuente por magnitud** `[PROPUESTA]`: E4.7 compone y enlaza; no reimplementa E2.4/E4.5/E3.6. Gastos anuales desde E2.4/E4.5; flujo y márgenes desde E2.6; Neto compartido desde E3.6, nunca `G_b + Neto` (`spec21:318-375`).
- **Comida auxiliar** `[CONFIRMADO]`: no crea Gasto central ni se suma/resta al flujo (`spec21:358-366`).
- **Cobertura** `[CONFIRMADO]`: `null` ≠ `0`; `HastaCorte` no es anual; `NoAcreditada` no certifica (`spec20:1107-1113`).

## 3. Diseñable ya vs decisiones

**Diseñable ya** `[PROPUESTA]`: resumen anual de solo lectura que seleccione ejercicio, declare corte/cobertura, consuma E2.4/E2.6/E3.6/E4.5, separe Ciclo y año y muestre plan/previsión/realidad en carriles distintos; sin tablas, snapshots ni totales persistidos.

| Requiere decisión | Estado | Efecto |
|---|---|---|
| **DT8: márgenes medio/estructural/real puntual/plan** | `[PENDIENTE]`; solo definidos `Margen frente a nómina real` (`spec12:167`) y `Margen estructural` (`spec12:168`). | Sin DT8 no se cumple E4.7-AC3 ni se cierra la spec. |
| **DT7 / E4.5 DEV** | `[PENDIENTE]`; sin archivo runtime. | Sin total anual verificado ni AC1 real; la spec puede definir `NoAcreditada`. |
| **Patrimonio / E4.3** | `[PENDIENTE]`; E4.3 sin DEV; E4.6 Q10 propone excluirlo. | Si entra, E4.3 bloquea DEV. |
| **Total anual verificado** | `[PENDIENTE]`; exige cobertura completa, universo DT7 y sin huecos/solapes/mapping. | Si no: subtotal + motivo, nunca total. |
| **Previsión anual / E4.6** | `[PENDIENTE]`; E2.5 solo simula por paga/mes; E4.6 no compara años. | No sumar previsión como año; consumir motores propietarios. |

## 4. Recomendación

**No abrir SPEC25 completa ahora** `[PROPUESTA]`: obligaría a fijar contratos provisionales de E4.6, E4.5, E4.3 y DT8, con alto riesgo de reescritura y duplicación; además DEV25 no puede empezar y E4.7 no es el único bloqueo de E4.8/E4.9.

**Sí preparar un documento de frontera/contrato de consumo** (2–3 páginas, sin numerar SPEC25): matriz fuente/magnitud, estados de cobertura y AC candidatos. Abrir SPEC25 cuando DT8 defina márgenes; E4.6 se apruebe o se desacople; se decida patrimonio/E4.3 y Comida/E3.5; y se acepte que sin E4.5 DEV/DT7 solo habrá subtotales.

## 5. Decisiones y próximos pasos

1. `[PENDIENTE]` DT8: fórmulas de los cuatro márgenes, formato y filtros.
2. `[PENDIENTE]` ¿Patrimonio/valoración y deuda entran? Recomendación: no.
3. `[PENDIENTE]` Previsión anual: simulación separada, no suma.
4. `[PENDIENTE]` E4.6: contrato aprobado o desacoplamiento; recomendación: motores propietarios.
5. `[CONFIRMADO]` Ingresos históricos: solo detalle; precontrol No disponible (E4.5 Q2=A).
6. `[CONFIRMADO]` Neto compartido: `G_n = G_b − R_adj`, atribuido por Gasto.

**Próximo paso:** el coordinador lleva 1–4 al usuario. Sin resolverlas no se abre SPEC25, no se autoriza DEV25 y no se declara PASS. Este documento es solo evidencia de inventario y frontera.
