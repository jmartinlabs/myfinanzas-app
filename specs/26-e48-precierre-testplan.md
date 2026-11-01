# 26 — E4.8 Precierre y controles de consistencia: Test plan

Specification: [26-e48-precierre-specification.md](26-e48-precierre-specification.md)

Status: **APPROVED — diseño documental; DEV funcional implementado el 2026-11-01.**
La matriz original conserva sus estados de diseño; la evidencia funcional se registra
en «Evidencia funcional E4.8 — 2026-11-01». La aprobación visual de W1–W6 sigue
pendiente y no se declara por las capturas de la UI provisional.

Revisión documental 2026-10-31, actualizada 2026-11-01 sobre `main` `46c7dd1`: se precisan
permisos, idempotencia de lectura, resultados vacíos/errores y referencias a los
wireframes propuestos. Ningún escenario está demostrado: la matriz sigue siendo
hipótesis de diseño y no declara PASS.

Base de aprobación: `main` `f077b7e`, esquema 18; revisión documental: `main` `46c7dd1`.

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

## Evidencia funcional E4.8 — 2026-11-01

Implementación funcional de solo lectura en `apps/api/src/precierre.ts`, rutas
`GET /api/cierres/precierre/:ciclo` y `GET /api/cierres/:ciclo/estado`, y pantalla
provisional `apps/web/src/Precierre.tsx`. Sin cierre, fotos, escritura, cambios de S0
ni ejecución de backups.

Comandos ejecutados:

- `NODE_ENV=test bun test apps/api/src/precierre.test.ts` → **19 PASS / 0 FAIL**.
- `bun run test:e2e tests/e2e/precierre.spec.ts` → **1 PASS** (1440/390, estados y
  solo lectura).
- `bun run typecheck` y `bun run build` → **PASS**.

| AC | Resultado | Evidencia / límite |
| --- | --- | --- |
| AC-01 | PASS | Ventana, S0 y estado; API + E2E |
| AC-02 | PASS | `SIN_SIGUIENTE_INICIO`; sin Fin inventado |
| AC-03 | PASS | `S0_AUSENTE` con seam de test; no se crea S0 |
| AC-04 | PASS parcial | Referencia y partida inactiva bloquean; no se modela toda clasificación inconsistente |
| AC-05 | PASS | E4.1 efectivo/cantidades a Fin; operación posterior excluida y múltiples cuentas; valoración `No disponible` |
| AC-06 | PASS | Posición previa no es vacío; sin posición, vacío explícito |
| AC-07 | PASS | E4.3/E4.2/E4.4 como aviso/no disponible, no cero |
| AC-08 | PASS | `BACKUP_NO_VERIFICABLE` bloquea por defecto |
| AC-09 | PASS | POST/PATCH/DELETE → 405, `Allow: GET`, sin escritura |
| AC-10 | PASS | GET repetido conserva `revision`; sin escritura |
| AC-11 | PASS revisión | Cambio de Movimiento o de importe del plan cambia `revision`; el 409 de confirmación pertenece a E4.9 |
| AC-12 | PASS | `SinPlan` válido; no bloquea |
| AC-13 | PASS | Revisión de plan divergente en `cycle_plan_audit` bloquea; sin seam |
| AC-14 | PASS | E3.5 `No disponible`, cobertura parcial y E4.9 bloqueado |
| AC-15 | PASS | `/estado` comparte `revision` y estado con precierre |
| AC-16 | PASS contrato | Cierre posterior coherente avisa; incoherente bloquea; proveedor de cierres es seam hasta SPEC27 |

**Límites:** los proveedores de backup y cierres posteriores son seams de contrato;
por defecto no hay evidencia DT6 y el precierre queda bloqueado. Las fuentes auxiliares
son conteos informativos con cobertura parcial/no acreditada; no se presentan como
conciliadas. E4.1 exige cuentas aplicables y bloquea si no están disponibles. No se ha
ejecutado restore real, cierre, foto ni backup. La aprobación visual de W1–W6 sigue
pendiente.

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

Ejecutados los focales de precierre, typecheck, build y E2E de la pantalla. La
regresión completa de API/E2E queda sujeta a CI Linux; no se declara PASS global.
CI `required` de PR #150: run `41283298829` **PASS** (perfil crítico; E2E de navegador
no se ejecuta en ese perfil).

## Functional verification

**PASS de contrato** para los 16 AC en `apps/api/src/precierre.test.ts` (19/19) y la
ruta HTTP de solo lectura. AC-11 acredita cambio de `revision` por Movimiento y por
importe del plan; el 409 de confirmación pertenece a E4.9. AC-13 usa una revisión de
plan divergente real; AC-16 usa el seam del proveedor de cierres hasta SPEC27. AC-04
queda parcial: cubre referencia/partida inactiva, no toda clasificación inconsistente.

## Browser verification

**PASS funcional provisional**: E2E 1440/390 en `tests/e2e/precierre.spec.ts`, con
estados, fuentes, backup y control de cierre deshabilitado. La UI es provisional.
La revisión visual de W1–W6 sigue pendiente y no se declara aprobada; las capturas
E2E no sustituyen esa aprobación ni una auditoría de accesibilidad.

## Limitations and next action

La aprobación visual de los wireframes, DT6/T-BKP, el cierre E4.9 y cualquier uso con
datos reales son gates separados. El precierre implementado es de solo lectura; por
defecto el backup no tiene evidencia y queda bloqueado. No se cierra E4.9 ni se
autoriza escritura, migración, activación o despliegue.
