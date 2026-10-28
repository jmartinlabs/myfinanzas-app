# 26 — E4.8 Precierre y controles de consistencia: Test plan

Specification: [26-e48-precierre-specification.md](26-e48-precierre-specification.md)

Status: **DRAFT — diseño documental; todos los AC UNRUN.** No hay implementación,
código, CI, migración ni datos reales. DT3, DT4 y DT6/T-BKP siguen abiertos.

Base: `main` `f077b7e`, esquema 18.

| Acceptance ID | Precondiciones y acción | Resultado esperado | Método/comando propuesto | Plataforma/owner | Evidencia esperada | Estado actual | Candidato/fecha |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-01 | Ciclo con siguiente Inicio y S0; abrir precierre | Ventana finita, S0 visible; `Listo`/`Listo con avisos`; sin escritura | Bun Test de contrato + Playwright | Documental; API/UI futura | DTO y captura 390/1440 | UNRUN — diseño | — |
| AC-02 | Ciclo sin siguiente Inicio; abrir precierre | `Bloqueado` por `DT3_PENDIENTE`; no Fin ni fecha inventada | Bun Test + UI | Documental; API/UI futura | DTO con motivo y bloqueo | UNRUN — diseño | — |
| AC-03 | Ciclo sin S0 | `Bloqueado`; no se crea S0 | Bun Test | Documental; API futura | DTO y ausencia de escritura | UNRUN — diseño | — |
| AC-04 | Movimientos/clasificación/Referencias inconsistentes | `Bloqueado`; no se corrige ni escribe | Bun Test de consistencia | Documental; API futura | Lista de inconsistencias | UNRUN — diseño | — |
| AC-05 | Ciclo con posiciones E4.1, incluidas anteriores | Instrumentos/Compras/efectivo/posiciones a Fin; valoración/patrimonio `No disponible` | Bun Test de contrato + Playwright | Documental; API/UI futura | DTO y captura | UNRUN — diseño | — |
| AC-06 | Ciclo sin Compras nuevas con posiciones anteriores; después sin operaciones históricas | Con posiciones: acumulado a Fin, no vacío/0; sin operaciones: vacío explícito; no bloqueo automático | Bun Test | Documental; API futura | DTO con posición/vacío | UNRUN — diseño | — |
| AC-07 | E4.3/E4.2/E4.4 no disponibles | Aviso/parcial con motivo; no cero ni bloqueo automático | Bun Test + Playwright | Documental; API/UI futura | DTO y captura de estados | UNRUN — diseño | — |
| AC-08 | Backup sin evidencia DT6/T-BKP | `Bloqueado`; no se permite cerrar | Bun Test de preflight | Documental; API futura | DTO con bloqueo y motivo | UNRUN — diseño | — |
| AC-09 | POST/PATCH/DELETE en precierre | 405/422; sin escritura | Bun Test HTTP | Documental; API futura | Respuesta y snapshot sin cambios | UNRUN — diseño | — |
| AC-10 | Abrir precierre y comprobar S0/ventana | S0/ventana intactos; sin cierre ni ciclo siguiente | Bun Test + SQL snapshot | Documental; API futura | Snapshot antes/después | UNRUN — diseño | — |
| AC-11 | Cambiar fuente entre preview y confirmación | Revisión/hash cambia; `IMPACT_CHANGED`/409 al confirmar | Bun Test de concurrencia | Documental; API futura | Dos revisiones y 409 | UNRUN — diseño | — |
| AC-12 | Ciclo `SinPlan` | No bloquea; muestra `Sin plan`; no inventa líneas | Bun Test | Documental; API futura | DTO con `SinPlan` | UNRUN — diseño | — |
| AC-13 | Plan con líneas inconsistentes/duplicadas/no verificables | `Bloqueado`; motivo; no se captura plan | Bun Test | Documental; API futura | DTO con motivo | UNRUN — diseño | — |
| AC-14 | E3.5/FIN_NETA no disponible | Precierre parcial con motivo; E4.9 bloqueado; no completo | Bun Test + UI | Documental; API/UI futura | DTO y captura | UNRUN — diseño | — |
| AC-15 | `GET /api/cierres/:ciclo/estado` | Ruta canónica compartida con SPEC27; misma versión/estado; solo lectura | Bun Test de contrato | Documental; API futura | Respuesta de estado | UNRUN — diseño | — |

## Regression checks

Pendientes de implementación. No se declara PASS; la matriz es de diseño.

## Functional verification

UNRUN. No hay endpoints ni UI de E4.8 implementados.

## Browser verification

UNRUN. Wireframes pendientes de aprobación; no hay capturas 390/1440 de E4.8.

## Limitations and next action

La aprobación de la spec y los wireframes, DT3/DT4/DT6 y cualquier DEV son gates
separados. No se ejecutan pruebas hasta autorización de desarrollo.
