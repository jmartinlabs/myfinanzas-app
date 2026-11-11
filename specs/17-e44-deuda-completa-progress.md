# 17 — E4.4 Deuda completa y conciliación desde apertura: Progress

Status: **DEV17 MERGED `024b348` (2026-11-03), CI post-merge `41668073386` SUCCESS.
QA-01 (2026-11-09) revalidó la cobertura y añadió pruebas para AC-19/21/23/25/29/30/31.
Registro 2026-11-11: AC-19/21/23/25/30 acreditados en CI y AC-29 registrado como PASS
(fixtures) de API, pendiente de run E2E y aceptación visual. Ningún AC/TP en PASS
funcional.** La suite E4.4 existe y pasó en local; no hay veredicto AC por AC ni aceptación
visual final. Este documento registra evidencia post-merge y la
reconciliación de la matriz con las pruebas realmente existentes; no reabre reglas, AC,
migraciones ni autoriza nuevos cambios.

Task ID: `SPEC17-E4.4` — Deuda completa y conciliación desde apertura.
Fecha: 2026-11-03; revisión QA-01: 2026-11-09.
Fuentes: [specification](17-e44-deuda-completa-specification.md),
[testplan](17-e44-deuda-completa-testplan.md), PR #176 y CI de `main`.
Base contrastada: `main` `7306494`; el candidato E4.4 se integró sobre `main` `356644c` y
hoy convive con el esquema **v27** (rama `qa01/e44-deuda` sobre `test` `dbfe507`).

## 1. Estado y alcance integrado

- **Merge:** PR #176, squash `024b348` en `main` (2026-11-03 16:50 +0100).
- **Alcance entregado (A+B+C):**
  - **A — Datos y lectura:** columnas nullable de Deuda, conciliaciones con auditoría,
    contrato C23 (270 objetos), backup/restore v23 y migración v22→v23.
  - **B — Escrituras:** alta/edición de tipo, TIN, TAE, cuota contractual y condiciones;
    `motivo` obligatorio al corregir datos ya informados; conciliación idempotente con
    revisión, auditoría y anulación; 409/422.
  - **C — UI/E2E:** listado y ficha 1440/390, secciones con contadores, formularios,
    estados, teclado/foco y capturas ficticias.
- **Esquema vigente:** E4.3 integró el esquema **v24** (`3b9be46`) y la cadena posterior
  alcanza **v27** en esta rama. La migración de E4.4 se conserva; `deudas-v23-migration.test.ts`
  cubre v21→v27 y v22→v27, C23 permanece congelado y C27 es el contrato actual. El cambio de
  versión no altera la semántica E4.4.
- **Fuera de alcance (sin cambios):** fórmula E1.6 y contratos de escritura, `getDebt`,
  Saldos, Movimientos, importación/Excel, datos reales, despliegue, E4.5/E4.6/E4.7/E4.11 y
  cualquier AC nuevo.

## 2. Evidencia de ejecución registrada

| Comprobación | Candidato / base | Entorno | Resultado |
| --- | --- | --- | --- |
| `required` PR #176 | `568cd55`; rollup posterior del HEAD | Linux CI | **PASS** (`41662231745`; rollup `41665454524`, `41666990820`) |
| Workflow `full` PR #176 | HEAD de la PR (`72796ef`) | Linux CI | **SUCCESS** (`41665505364`): E2E 1440/390, E1.6 y restore real con `age`/MFA |
| E2E E4.4 | árbol de `024b348` | Playwright/Chromium | **1 passed** (MFA real, 1440/390, 409/422/404, capturas ficticias) |
| Suite API local | árbol de `024b348` | macOS | 56 fallos de entorno idénticos a `main`; no se usan como evidencia de producto |
| CI post-merge | `024b348` | Linux CI | **SUCCESS** (`41668073386`) |
| CI de `main` actual | `7306494` | Linux CI | **SUCCESS** (`41731496251`); incluye la suite E4.4 actualizada a v24 |
| QA-01 read model | `qa01/e44-deuda` | macOS, Bun 1.4.3 | **11 pass / 0 fail** (`bun test apps/api/src/deuda-completa.test.ts`); incluye AC-21/25/29/30/31 |
| QA-01 conciliación | `qa01/e44-deuda` | macOS, Bun 1.4.3 | **3 pass / 0 fail** (`bun test apps/api/src/conciliaciones.test.ts`); incluye multiproceso AC-19 |
| QA-01 migración | `qa01/e44-deuda` | macOS, Bun 1.4.3 | **7 pass / 0 fail** (`bun test apps/api/src/deudas-v23-migration.test.ts`); incluye v21→v27 AC-23 |
| QA-01 consumidores E4.6/E4.7 | `qa01/e44-deuda` | macOS, Bun 1.4.3 | **47 pass / 0 fail** en el conjunto `deuda-completa` + `conciliaciones` + `deudas-v23-migration` + `resumen-inicio` + `resumen-anual` |
| QA-01 typecheck | `qa01/e44-deuda` | macOS, TypeScript 7.0.2 | **PASS** (`bun run typecheck`) |
| QA-01 `deudas.test.ts` | `qa01/e44-deuda` | macOS, Bun 1.4.3 | 10 pass / **1 fail de entorno** (`Ancestro no confiable` en backup age); no es fallo E4.4 |
| QA-01 contrato E4.4 | `qa01/e44-deuda` | macOS, Bun 1.4.3 | 1 pass / 2 skip (gates Linux de backup/restore) |
| CI E4.4 posterior (AC-19/21/23/25/29/30) | `d2fde23` (#375) | Linux CI | **PASS** (`42925487584`): suite API completa, **1123 pass / 0 fail**, 76 archivos; incluye `deuda-completa`, `conciliaciones` y `deudas-v23-migration` |
| Merge #375 | `f56847a` | `test` | **MERGED**; sin cambio de esquema ni contrato |

Lectura correcta: PASS/SUCCESS acredita la ejecución de la suite y del workflow, **no** un
PASS funcional de los 33 AC. El dictamen de QA fue **APTO CON RESERVAS**, sin defecto
financiero, de esquema o migración; las reservas y la aceptación visual siguen abiertas.

### Archivos de prueba del candidato actual

| Archivo | Pruebas | Cobertura principal |
| --- | --- | --- |
| `apps/api/src/deuda-completa.test.ts` | 11 tests | read model, listado/ficha, corte, `null ≠ 0`, desglose inválido, anulados, rectificación AC-21, consumidores AC-25, estados AC-29, rechazos AC-30, regresión AC-31, rutas GET |
| `apps/api/src/deudas.test.ts` | test E4.4 (`AC-01/02/03/04/20/26/32/33`) | alta/PATCH de metadatos, motivo, límites, auditoría, idempotencia |
| `apps/api/src/conciliaciones.test.ts` | 3 tests | conciliación HTTP, diferencias, duplicado 409, corrección/anulación, concurrencia multiproceso AC-19, auditoría |
| `apps/api/src/deudas-v23-migration.test.ts` | 7 tests | v21→v27 y v22→v27 aditivas, FK, rollback, versión desconocida, dos arranques, límites |
| `apps/api/src/e44-schema-contract.test.ts` | 3 tests | C23 congelado, C24, backup/manifiesto/restore y MFA (backup en Linux) |
| `tests/e2e/deudas-completa.spec.ts` | 1 test | 1440/390, vacío, formulario, corte, conciliación, `Varias`, teclado/foco |

## 3. Mapa AC ↔ prueba

Leyenda: **CUBIERTO** = existe prueba directa y la suite pasó en CI, sin declarar PASS del
AC; **CUBIERTO local** = prueba directa añadida o reforzada en QA-01 que pasó en local,
pendiente de CI; **PARCIAL** = cubre parte del AC; **UNRUN** = sin prueba específica;
**BLOCKED** = dependencia externa. Ningún estado equivale a PASS funcional.

| AC | Comprobación esperada | Prueba existente | Estado |
| --- | --- | --- | --- |
| AC-01 | Alta/consulta con campos E1.6 + tipo/condiciones; sin Movimiento/Saldo de apertura | `deudas.test.ts` (AC-01); `deuda-completa.test.ts` listado/ficha | CUBIERTO |
| AC-02 | TIN/TAE/cuota/condiciones exactos; no calculan; inválidos 422 | `deudas.test.ts` (AC-02/32); `deuda-completa.test.ts` condiciones | CUBIERTO |
| AC-03 | Enum Hipotecaria/No hipotecaria/null; filtro; sin inferencia | `deudas.test.ts` (AC-03); ruta `?tipoDeuda=` | CUBIERTO |
| AC-04 | Histórico/precontrol solo lectura; POST/PATCH 422 | `deudas.test.ts` (AC-04); R5 en `deuda-completa.test.ts` | CUBIERTO |
| AC-05 | Relación R5 inconsistente visible con diferencia exacta; capital intacto | `deuda-completa.test.ts` (+10, capital 720) | CUBIERTO |
| AC-06 | Capital aplicado = Σ capital; deuda viva = apertura − aplicado | `deuda-completa.test.ts` (280/720) | CUBIERTO |
| AC-07 | Cuota 100 = 80 capital + 20 intereses; Gasto 100; banco −100 | `deuda-completa.test.ts` historia/totales | CUBIERTO |
| AC-08 | Extraordinaria 200; Gasto 0; banco −200; capital −200 | `deuda-completa.test.ts` historia | CUBIERTO |
| AC-09 | Precontrol visible, `aplicaAlCapital=false`, no reduce deuda | `deuda-completa.test.ts` H1 y totales | CUBIERTO |
| AC-10 | Corte inclusivo; otra Deuda y hechos posteriores excluidos | `deuda-completa.test.ts` corte y desglose | CUBIERTO |
| AC-11 | Corte anterior/sin Inicio/sin apertura → no calculable con motivo | `deuda-completa.test.ts` (posición sin hechos) | CUBIERTO |
| AC-12 | Apertura 0 explícita vs ausente; sin normalizar | `deuda-completa.test.ts` | CUBIERTO |
| AC-13 | Desglose inválido bloquea solo esa Deuda y ese corte; IDs/motivo | `deuda-completa.test.ts` (9101/9102, multideuda) | CUBIERTO |
| AC-14 | Negativo heredado visible, sin clamp; E1.6 sigue bloqueando nuevos excesos | `deuda-completa.test.ts` (−10/+10); regresión E1.6 en CI | CUBIERTO |
| AC-15 | Diferencia declarado−derivado exacta; 0/≠0; fecha futura 422; `Varias` | `deuda-completa.test.ts`; `conciliaciones.test.ts` (AC-15) | CUBIERTO |
| AC-16 | Corrección/anulación con motivo, revisión y auditoría; sin DELETE | `conciliaciones.test.ts` (AC-16) | CUBIERTO |
| AC-17 | Conciliación antes del control o sin base → `No comparable` | `conciliaciones.test.ts` (AC-17) | CUBIERTO |
| AC-18 | Duplicado vigente 409; fechas distintas; listado última + `Varias` | `conciliaciones.test.ts` (AC-18); `deuda-completa.test.ts` | CUBIERTO |
| AC-19 | Revisión obsoleta 409; idempotencia; sin escritura parcial | `conciliaciones.test.ts` (multiproceso real: idempotencia, duplicado y PATCH concurrente); `deudas.test.ts` | **CUBIERTO (CI)**: `42925487584` |
| AC-20 | `motivo` obligatorio al corregir tipo/condición ya informados | `deudas.test.ts` (sin motivo 422; con motivo 200) | CUBIERTO |
| AC-21 | Rectificar/anular pago; recálculo de deuda y conciliación | `deuda-completa.test.ts` (anulación + rectificación de importe, fecha y Deuda; ambas Deudas) | **CUBIERTO (CI)**: `42925487584` |
| AC-22 | Sin capital/historia persistidos; derivados rechazados; sin segundo ledger | `deuda-completa.test.ts` rutas sin escrituras; `conciliaciones.test.ts` sin columna `diferencia` | CUBIERTO |
| AC-23 | Migración desde versión vigente; rollback; versión desconocida; dos arranques | `deudas-v23-migration.test.ts` (v21→v27 y v22→v27, rollback, versión desconocida, dos arranques) | **CUBIERTO (CI)** v21/v22→v27: `42925487584` |
| AC-24 | Backup/manifiesto/restore con campos, conciliaciones y MFA | `e44-schema-contract.test.ts` (gate Linux) | CUBIERTO en Linux CI |
| AC-25 | Consumidor E4.6/E4.7 recibe capital/tipo sin sumar a Saldos | `deuda-completa.test.ts` (agregado no hipotecario, tipo separado, Saldo intacto, sin duplicar Gasto/capital); `resumen-inicio`/`resumen-anual` | **CUBIERTO (CI)**: `42925487584` |
| AC-26 | 401/403/422; sin fuga; sin DELETE; límites JSON | `deudas.test.ts`; `conciliaciones.test.ts`; rutas GET | CUBIERTO |
| AC-27 | 1440 listado/ficha/corte/histórico/conciliación; foco/teclado | `tests/e2e/deudas-completa.spec.ts` | CUBIERTO, sin aceptación visual |
| AC-28 | 390 mismas pantallas; sin overflow; acciones accesibles | `tests/e2e/deudas-completa.spec.ts` | CUBIERTO, sin aceptación visual |
| AC-29 | Vacío/carga/parcial/no calculable/diferencia/401/404/409/422 | `deuda-completa.test.ts` (parcial, no calculable, diferencia, 404/422); rutas GET; `deudas-completa.spec.ts` (401/409/404, skeleton, error de red y borrador conservado, #375) | **PASS (fixtures)**: API de estados en CI `42925487584`; E2E de AC29 sin run `full` registrado; aceptación visual pendiente |
| AC-30 | Rechazo de simulación/cuadro/previsión/comisión/activo/ajuste | `deuda-completa.test.ts` (POST/PATCH/conciliación 422 y cero hechos creados) | **CUBIERTO (CI)**: `42925487584` |
| AC-31 | Regresión E1.1–E1.6 y cuatro Tipos | `deuda-completa.test.ts` (cuota Gasto, extraordinaria sin Gasto, `getDebt`/`debtPeriod`, matriz de Tipos, Exterior bloqueado, lectura sin hechos); suite completa en CI Linux x64 | **PASS (fixtures)**: prueba dedicada + CI `full` `42863718688` sobre `1d288c5`; verificación focalizada de requisitos (2026-11-10) |
| AC-32 | EUR/tasas/textos/fechas exactos; 422; sin float/redondeo | `deudas.test.ts` (AC-32); migración (límites) | CUBIERTO |
| AC-33 | Auditoría actor/UTC/anterior/posterior/motivo; append-only | `deudas.test.ts`; `conciliaciones.test.ts` | CUBIERTO |

**Resumen tras el registro 2026-11-11:** 31 CUBIERTO con evidencia CI (incluye
AC-19/21/23/25/30 vía `42925487584`), 2 **PASS (fixtures)** (AC-29 de API y AC-31) y 0 AC sin
prueba. AC-29 conserva la reserva de su E2E sin run `full` registrado. Ningún estado es PASS
funcional ni aceptación financiera real.
Los CUBIERTO dependen de la ejecución de CI registrada. Nada de esto sustituye la validación
AC por AC ni la aceptación visual.

## 4. Límites y reservas

- **Sin PASS funcional:** el dictamen QA-2 fue APTO CON RESERVAS; no hay veredicto AC por
  AC ni aceptación visual de W1–W5/S1–S13.
- **Cobertura:** AC-29 queda **PASS (fixtures)** en su dimensión API (CI `42925487584`) con
  skeleton, error de red y borrador conservado implementados en #375; su E2E no tiene run
  `full` registrado y la aceptación visual sigue pendiente. AC-31 mantiene **PASS (fixtures)**
  con la suite E1.1–E1.6 y el run `42863718688`. AC-19/21/23/25/30 quedan acreditados en CI.
- **Testplan reconciliado:** [17 testplan](17-e44-deuda-completa-testplan.md) ya refleja
  DEV17 integrado, la ejecución local de QA-01 y enlaza este mapa. Su matriz conserva el
  estado de diseño `UNRUN` a propósito; no se ha convertido en PASS.
- **Reserva de entorno:** los 56 fallos de la suite API en macOS son de entorno y no
  acreditan el gate Linux; el gate es CI Linux.
- **Sin datos reales:** toda la evidencia usa fixtures ficticios y bases locales/CI; no se
  ejecutó migración operativa, backup real, despliegue ni merge adicional.

## 5. Próxima acción

1. Cuando exista un despliegue o una ejecución `full` autorizada, registrar el run E2E de
   AC-29; no repetir `full` solo para este registro.
2. Decidir con el usuario la aceptación visual de W1–W5/S1–S13 antes de proponer cualquier
   cierre funcional.
3. No abrir E4.5/E4.6/E4.7, v25, datos reales ni despliegue por este documento.
