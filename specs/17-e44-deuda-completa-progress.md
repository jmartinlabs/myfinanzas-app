# 17 — E4.4 Deuda completa y conciliación desde apertura: Progress

Status: **DEV17 MERGED `024b348` (2026-11-03), CI post-merge `41668073386` SUCCESS.
Ningún AC/TP en PASS.** La suite E4.4 existe y pasó en CI; no hay veredicto AC por AC ni
aceptación visual final. Este documento registra evidencia post-merge; no reabre reglas,
AC, migraciones ni autoriza nuevos cambios.

Task ID: `SPEC17-E4.4` — Deuda completa y conciliación desde apertura.
Fecha: 2026-11-03.
Fuentes: [specification](17-e44-deuda-completa-specification.md),
[testplan](17-e44-deuda-completa-testplan.md), PR #176 y CI de `main`.
Base contrastada: `main` `7306494`; el candidato E4.4 se integró sobre `main` `356644c` y
hoy convive con el esquema **v24** de E4.3.

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
- **Esquema vigente:** E4.3 integró después el esquema **v24** (`3b9be46`). La migración de
  E4.4 se conserva y el test `deudas-v23-migration.test.ts` se actualizó a v22→v24; C23
  permanece congelado y C24 es el contrato actual. El cambio de versión no altera la
  semántica E4.4.
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

Lectura correcta: PASS/SUCCESS acredita la ejecución de la suite y del workflow, **no** un
PASS funcional de los 33 AC. El dictamen de QA fue **APTO CON RESERVAS**, sin defecto
financiero, de esquema o migración; las reservas y la aceptación visual siguen abiertas.

### Archivos de prueba existentes en `main`

| Archivo | Pruebas | Cobertura principal |
| --- | --- | --- |
| `apps/api/src/deuda-completa.test.ts` | 6 tests | read model, listado/ficha, corte, `null ≠ 0`, desglose inválido, anulados, rutas GET |
| `apps/api/src/deudas.test.ts` | test E4.4 (`AC-01/02/03/04/20/26/32/33`) | alta/PATCH de metadatos, motivo, límites, auditoría, idempotencia |
| `apps/api/src/conciliaciones.test.ts` | 2 tests | conciliación HTTP, diferencias, duplicado 409, corrección/anulación, concurrencia, auditoría |
| `apps/api/src/deudas-v23-migration.test.ts` | 6 tests | v22→v24 aditiva, FK, rollback, versión desconocida, dos arranques, límites |
| `apps/api/src/e44-schema-contract.test.ts` | 3 tests | C23 congelado, C24, backup/manifiesto/restore y MFA (backup en Linux) |
| `tests/e2e/deudas-completa.spec.ts` | 1 test | 1440/390, vacío, formulario, corte, conciliación, `Varias`, teclado/foco |

## 3. Mapa AC ↔ prueba

Leyenda: **CUBIERTO** = existe prueba directa y la suite pasó en CI, sin declarar PASS del
AC; **PARCIAL** = cubre parte del AC; **UNRUN** = sin prueba específica; **BLOCKED** =
dependencia externa.

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
| AC-19 | Revisión obsoleta 409; idempotencia; sin escritura parcial | `conciliaciones.test.ts`; `deudas.test.ts` | PARCIAL: concurrencia en un proceso; no multiproceso |
| AC-20 | `motivo` obligatorio al corregir tipo/condición ya informados | `deudas.test.ts` (sin motivo 422; con motivo 200) | CUBIERTO |
| AC-21 | Rectificar/anular pago; recálculo de deuda y conciliación | `deuda-completa.test.ts` (anulación); rectificación no directa | PARCIAL |
| AC-22 | Sin capital/historia persistidos; derivados rechazados; sin segundo ledger | `deuda-completa.test.ts` rutas sin escrituras; `conciliaciones.test.ts` sin columna `diferencia` | CUBIERTO |
| AC-23 | Migración desde versión vigente; rollback; versión desconocida; dos arranques | `deudas-v23-migration.test.ts` (v22→v24) | PARCIAL: v22→v24 cubierto; v21→v24 no explícito |
| AC-24 | Backup/manifiesto/restore con campos, conciliaciones y MFA | `e44-schema-contract.test.ts` (gate Linux) | CUBIERTO en Linux CI |
| AC-25 | Consumidor E4.6/E4.7 recibe capital/tipo sin sumar a Saldos | Contrato de lectura; consumidor no implementado | UNRUN |
| AC-26 | 401/403/422; sin fuga; sin DELETE; límites JSON | `deudas.test.ts`; `conciliaciones.test.ts`; rutas GET | CUBIERTO |
| AC-27 | 1440 listado/ficha/corte/histórico/conciliación; foco/teclado | `tests/e2e/deudas-completa.spec.ts` | CUBIERTO, sin aceptación visual |
| AC-28 | 390 mismas pantallas; sin overflow; acciones accesibles | `tests/e2e/deudas-completa.spec.ts` | CUBIERTO, sin aceptación visual |
| AC-29 | Vacío/carga/parcial/no calculable/diferencia/401/404/409/422 | E2E cubre vacío, 422, 409, 404 y estados de ficha | PARCIAL: carga/parcial/error de red/401 no todos |
| AC-30 | Rechazo de simulación/cuadro/previsión/comisión/activo/ajuste | Sin prueba dedicada; ausencia en contrato/API | UNRUN |
| AC-31 | Regresión E1.1–E1.6 y cuatro Tipos | Suite completa del CI `full`; E1.6 actualizado | PARCIAL: regresión global, sin prueba E4.4 dedicada |
| AC-32 | EUR/tasas/textos/fechas exactos; 422; sin float/redondeo | `deudas.test.ts` (AC-32); migración (límites) | CUBIERTO |
| AC-33 | Auditoría actor/UTC/anterior/posterior/motivo; append-only | `deudas.test.ts`; `conciliaciones.test.ts` | CUBIERTO |

**Resumen:** 26 CUBIERTO, 5 PARCIAL (AC-19/21/23/29/31), 2 UNRUN (AC-25/30) y 0 PASS de
AC. Los CUBIERTO dependen de la ejecución de CI registrada; no sustituyen la validación
AC por AC ni la aceptación visual.

## 4. Límites y reservas

- **Sin PASS funcional:** el dictamen QA-2 fue APTO CON RESERVAS; no hay veredicto AC por
  AC ni aceptación visual de W1–W5/S1–S13.
- **Cobertura incompleta:** consumidor E4.6/E4.7 (AC-25), exclusiones de simulación
  (AC-30), rectificación directa (AC-21), concurrencia multiproceso (AC-19), v21→v24
  (AC-23) y estados de carga/error/401 (AC-29).
- **Testplan desalineado:** [17 testplan](17-e44-deuda-completa-testplan.md) conserva la
  cabecera «DISEÑO DE PRUEBAS — NO EJECUTADO» y la matriz UNRUN. Este paquete no lo edita;
  se registra como hueco documental, no como evidencia nueva.
- **Reserva de entorno:** los 56 fallos de la suite API en macOS son de entorno y no
  acreditan el gate Linux; el gate es CI Linux.
- **Sin datos reales:** toda la evidencia usa fixtures ficticios y bases locales/CI; no se
  ejecutó migración operativa, backup real, despliegue ni merge adicional.

## 5. Próxima acción

1. Actualizar el testplan 17 para que su cabecera refleje DEV17 integrado y enlace este
   mapa, sin convertir CUBIERTO/PARCIAL en PASS.
2. Decidir con el usuario la aceptación visual y las reservas de cobertura (AC-19/21/23/29/
   30/31) antes de proponer cualquier cierre funcional.
3. No abrir E4.5/E4.6/E4.7, v25, datos reales ni despliegue por este documento.
