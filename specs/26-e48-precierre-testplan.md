# 26 — E4.8 Precierre y controles de consistencia: Test plan

Specification: [26-e48-precierre-specification.md](26-e48-precierre-specification.md)

Status: **APPROVED — diseño documental; todos los AC UNRUN.** No hay implementación,
código, CI, migración ni datos reales. Aprobado con SPEC26 el 2026-10-28; DT3/DT4
resueltas el 2026-10-28 y DT6/T-BKP sigue abierto.

Revisión documental 2026-10-31 sobre `main` `98b9792`: se precisan permisos, idempotencia
de lectura, resultados vacíos/errores y referencias a los wireframes propuestos. Ningún
escenario está demostrado: la matriz sigue siendo hipótesis de diseño y no declara PASS.

Base de aprobación: `main` `f077b7e`, esquema 18; revisión documental: `main` `98b9792`.

| Acceptance ID | Precondiciones y acción | Resultado esperado | Método/comando propuesto | Plataforma/owner | Evidencia esperada | Estado actual | Candidato/fecha |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-01 | Ciclo con siguiente Inicio y S0; abrir precierre | Ventana finita, S0 visible; `Listo`/`Listo con avisos`; sin escritura | Bun Test de contrato + Playwright | Documental; API/UI futura | DTO y captura 390/1440 | UNRUN — diseño | — |
| AC-02 | Ciclo sin siguiente Inicio; abrir precierre | `Bloqueado` por `SIN_SIGUIENTE_INICIO`; no Fin ni fecha inventada | Bun Test + UI | Documental; API/UI futura | DTO con motivo y bloqueo | UNRUN — diseño | — |
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
| AC-16 | Ciclo con cierres posteriores ya existentes, coherentes o con diferencia no explicable; abrir precierre | Aviso `CIERRE_FUERA_DE_ORDEN`; comprobación al mismo corte; sin diferencia no explicable no bloquea; con diferencia no explicable bloquea por `INCOHERENCIA_CON_CIERRE_POSTERIOR`; no escribe | Bun Test + UI | Documental; API/UI futura | DTO con aviso o bloqueo | UNRUN — diseño | — |

### Casos de contrato conceptuales (diseño, UNRUN)

Complementan la matriz sin añadir AC ni cambiar sus criterios:

- **Permisos:** lectura solo con sesión autenticada vigente; sin sesión `401` sin datos.
  No se definen roles nuevos. Se verifica junto con AC-09/AC-15.
- **Idempotencia:** dos `GET` consecutivos sin cambios en las fuentes devuelven la misma
  `revision`/hash y no alteran S0, ventana, hechos ni cierres (AC-10). Si cambia una
  fuente, la `revision` cambia (AC-11).
- **Vacío, no disponible y error:** una fuente vacía se distingue de `No disponible` y de
  error; ninguna se presenta como `0` (AC-06/AC-07). Un error conserva identidad y hechos
  conocidos y es reintentable.
- **Sin escritura:** `POST/PATCH/DELETE` devuelven 405/422 y no dejan snapshot alterado
  (AC-09). La lectura no ejecuta cierre, foto ni backup.
- **Wireframes:** revisión visual de W1–W6 en SPEC26; su aprobación es un gate separado y
  no sustituye pruebas funcionales ni auditoría de accesibilidad.

## Regression checks

Pendientes de implementación. No se declara PASS; la matriz es de diseño.

## Functional verification

UNRUN. No hay endpoints ni UI de E4.8 implementados; los casos anteriores son
hipótesis de contrato, no resultados.

## Browser verification

UNRUN funcional. Wireframes W1–W6 propuestos en SPEC26 el 2026-10-31, con vista HTML
documental y capturas estáticas 1440×1565 y 390×1985 en
`26-e48-precierre-captures/`; pendientes de aprobación visual. No hay UI de E4.8
implementada ni capturas de aplicación. Las capturas documentales no demuestran
accesibilidad, cálculo financiero ni PASS funcional.

## Limitations and next action

La aprobación de la spec y los wireframes, DT6/T-BKP y cualquier DEV son gates
separados; DT3/DT4 ya están resueltas. No se ejecutan pruebas hasta autorización de
desarrollo. La autorización vigente cubre solo preparación documental: esta matriz no
habilita DEV, cierre, E4.9 ni datos reales.
