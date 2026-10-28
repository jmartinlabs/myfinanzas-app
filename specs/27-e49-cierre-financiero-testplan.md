# 27 — E4.9 Cierre financiero y primera fotografía: Test plan

Specification: [27-e49-cierre-financiero-specification.md](27-e49-cierre-financiero-specification.md)

Status: **DRAFT — diseño documental; todos los AC UNRUN.** No hay implementación, código,
CI, migración ni datos reales. DT3, DT4 y DT6/T-BKP siguen abiertos.

Base: `main` `f077b7e`, esquema 18.

| Acceptance ID | Precondiciones y acción | Resultado esperado | Método/comando propuesto | Plataforma/owner | Evidencia esperada | Estado actual | Candidato/fecha |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-01 | Ciclo con ventana, S0, plan y backup; cerrar | Cierre y foto; `Cerrado`; sin ciclo siguiente | Bun Test + SQL snapshot | Documental; API futura | Cierre/foto y snapshot | UNRUN — diseño | — |
| AC-02 | Ciclo sin siguiente Inicio y sin DT3 | Bloqueo; no Fin inventado ni cierre | Bun Test + UI | Documental; API/UI futura | DTO con motivo | UNRUN — diseño | — |
| AC-03 | Movimiento en ventana cerrada | 409 `HISTORY_LOCKED`; sin escritura | Bun Test de guarda | Documental; API futura | Respuesta y snapshot | UNRUN — diseño | — |
| AC-04 | Mover Movimiento desde/hacia ventana cerrada | 409; fecha antigua y nueva comprobadas | Bun Test de guarda | Documental; API futura | Respuesta y snapshot | UNRUN — diseño | — |
| AC-05 | Reclasificación T2 en ciclo cerrado | Impacto/motivo/auditoría; foto intacta | Bun Test + UI | Documental; API/UI futura | Auditoría y foto | UNRUN — diseño | — |
| AC-06 | Renombrar Partida/Instrumento T3 | Permitido; foto conserva ID + versión | Bun Test | Documental; API futura | Foto y nombre vigente | UNRUN — diseño | — |
| AC-07 | Cerrar con hechos E4.1 | Posiciones en foto; valoración/patrimonio `No disponible` | Bun Test de contrato | Documental; API futura | Foto con cobertura | UNRUN — diseño | — |
| AC-08 | Cerrar sin E4.3/E3.5/E4.2/E4.4 | Parcial/`No disponible` con motivo; no 0 | Bun Test + UI | Documental; API/UI futura | Totales y motivos | UNRUN — diseño | — |
| AC-09 | Backup sin evidencia/restauración | Bloqueo antes de escribir | Bun Test de preflight | Documental; API futura | DTO de bloqueo | UNRUN — diseño | — |
| AC-10 | Reintento idéntico y payload distinto | Misma foto; 409 `IDEMPOTENCY_CONFLICT` | Bun Test de idempotencia | Documental; API futura | Respuestas y foto | UNRUN — diseño | — |
| AC-11 | Cambio concurrente preview/confirmación | 409 `IMPACT_CHANGED`/`REVISION_CONFLICT` | Bun Test de concurrencia | Documental; API futura | Dos revisiones y 409 | UNRUN — diseño | — |
| AC-12 | Fallo dentro de transacción | Rollback total; sin cierre/foto | Bun Test de fallo inducido | Documental; API futura | Snapshot sin cambios | UNRUN — diseño | — |
| AC-13 | Reabrir/cerrar por vía ordinaria | Solo E4.10 reabre el último; cierre ordinario no reabre | Bun Test + UI | Documental; API/UI futura | Respuesta y estado | UNRUN — diseño | — |
| AC-14 | Consultar foto tras T2/T3 | Foto inmutable; vistas vivas separadas | Bun Test + Playwright | Documental; API/UI futura | Foto y vista viva | UNRUN — diseño | — |
| AC-15 | Consumidor Anticipos sin proveedor real | AC36 sigue PARCIAL; no completo con ficticio | Bun Test de contrato AC36 | Documental; API futura | Estado AC36 y proveedor | UNRUN — diseño | — |

## Regression checks

Pendientes de implementación. No se declara PASS.

## Functional verification

UNRUN. No hay endpoints, transacción ni foto de E4.9 implementados.

## Browser verification

UNRUN. Wireframes pendientes; no hay capturas 390/1440 de E4.9.

## Limitations and next action

La aprobación de spec/wireframes, DT3/DT4/DT6 y cualquier DEV son gates separados. No se
ejecutan pruebas hasta autorización de desarrollo.
