# 37 — Registro coordinado de gastos: Test plan

Specification: [aprobada](37-registro-coordinado-gastos-specification.md) (D1–D10, AC-42/AC-43,
2026-11-16). Incrementos: [expediente](investigations/spec37-dev-increments-2026-11-16.md) (#484).
Estado: **I1 (`G-v30`) fusionado en `test`; I2 ejecutado, en revisión**; I3–I6 y los 43 AC siguen `UNRUN`.

Ámbito de este documento ahora: **I1**. Los 43 AC se incorporarán a la tabla de trazabilidad al
implementarse su incremento; no se declaran ejecutados por adelantado.

## Comandos y evidencia (I1)

Bun 1.4.3, macOS 15.5. Sin datos reales, sin Excel y sin migrar ninguna base real.

| Comando | Resultado |
| --- | --- |
| `bun test apps/api/src/spec37-schema.test.ts` | 9 pass / 1 skip / 0 fail |
| `bun test apps/api` | ver §Suite completa |
| `bun run typecheck` | PASS |
| `python3.12 scripts/check-project` | PASS |

El único `skip` local es la prueba de **backup/restore cifrado**: `backup` exige un árbol privado
de confianza y el `TMPDIR` de este entorno no lo es (`Ancestro no confiable.`). La misma prueba
se ejecuta en Linux CI, donde el árbol temporal sí es de confianza. No se declara PASS local.

## Trazabilidad de I1 (gate `G-v30`)

| Comprobación | Acción / precondición | Resultado esperado | Prueba |
| --- | --- | --- | --- |
| Migración aditiva | Base `v29` genuina (reconstruida y verificada contra `C29`), filas, identidad y auditoría | `v30`, `C29` sin objetos perdidos, único SQL modificado: la tabla extendida, filas intactas y columnas nuevas `NULL` | `v29 → v30 is additive…` |
| No regresión de Reparto | Pendiente `Reparto` heredado de `v29` | Se confirma con su Transferencia real después de migrar | `a migrated v30 keeps Reparto pendientes working` |
| Preflight de duplicados | Base `v29` con dos pendientes activos del mismo Gasto | Aborta antes de escribir: versión sigue `29`, sin índice nuevo, filas intactas | `the preflight rejects duplicate active pendientes…` |
| Inmutabilidad de `modalidad` | Fila con `NULL` y fila con `'A'` | `NULL→A`, `A→NULL`, `A→B` abortan con «modalidad inmutable»; el resto del pendiente sigue editable | `modalidad is immutable…` |
| Coherencia por origen | `RegistroCoordinado` sin modalidad; `Reparto` con modalidad | Abortan en `INSERT` y en `UPDATE`; valores fuera de catálogo y formatos inválidos rechazados | `coherence by origin…` |
| Un activo por Gasto | Dos altas para el mismo Gasto | La segunda aborta; otro Gasto permitido; al cancelar el primero se libera | `one active pendiente per Gasto` |
| Tabla de intentos | Clave `(operacion,key)`, `response` JSON | Duplicado y `response` no JSON rechazados | `operacion_coordinada_attempts is keyed…` |
| Centinela `v31` | Base con `schema_version=31` | Rechazo sin escrituras; manifiesto y versión intactos | `v31 is rejected before mutating` |
| Backup/restore | Base `v30` con pendiente `RegistroCoordinado` | Restaura `v30`, conserva columnas nuevas y mantiene el trigger | `encrypted backup/restore…` (**skip local**, CI Linux) |
| Contrato determinista | Dos bases nuevas | Manifiesto idéntico; `C30` con 380 objetos | `the v30 manifest is deterministic` |

## Trazabilidad de I2 (pendiente coordinado)

| AC | Acción / precondición | Resultado esperado | Prueba |
| --- | --- | --- | --- |
| AC-26 | Alta de pendiente coordinado sobre un Gasto real | Solo fila operativa y auditoría: `saldos`, `movimientos`, `movement_audit`, `fichas_anticipos`, `movimiento_anticipo`, `fotos_neto_apertura` y `counters` idénticos | `AC-26: el alta coordinada no crea Movimiento, ficha ni liquidez` |
| AC-32 | Modalidad B antes de confirmar | Sin ficha, Adelantado, Recuperado ni Neto; E3.1 vacío | `AC-32: modalidad B no crea ficha…` |
| AC-30 | Gasto anulado / con otra revisión | `requiereRevision`, motivo, confirmación bloqueada (`409 REVIEW_REQUIRED`), `gastoRevision` no se reescribe | `AC-30: Gasto anulado…`, `AC-30: Gasto con otra revisión…` |
| AC-39 | Referencia prevista deja de ser elegible | Motivo, bloqueo de confirmación, sin sustitución automática; se puede editar o cancelar | `AC-39: Referencia no elegible…` |
| AC-43 | Cambiar la modalidad | `422 MODALIDAD_INMUTABLE` antes de escribir; el trigger cubre también `NULL`; vía válida = cancelar y volver a crear | `AC-43: la modalidad es inmutable…` |
| AC-29 | Recorrer estados | Solo tres estados; el filtro por «Requiere revisión» no es un estado | `AC-29: tres estados…` |
| Negativos | Alta inválida | 19 rechazos de dominio y segundo activo → `409 GASTO_YA_GENERADO`, sin filas residuales | `validaciones del alta coordinada` |

Evidencia: Linux (Debian 13, bun 1.4.3) `bun test apps/api` → **1232 pass / 0 fail / 0 omitidas**.

## Suite completa

`bun test apps/api` — cifras del run final del incremento y comparación con la base `HEAD` para
separar los fallos de entorno de los introducidos por el cambio: ver la PR de I1. Los fallos de
entorno preexistentes (rutas de producción bajo directorios no confiables, `Ancestro no
confiable.`) se documentan aparte y no se atribuyen a v30.

## Contratos revisados, no ejecutados

- I2–I6: alcance y AC asignados en el expediente (§3 y §4). Sin implementación ni pruebas.
- Los 43 AC de SPEC37: `UNRUN`. La tabla de trazabilidad AC-01…AC-43 se completará en I6, con
  evidencia real por criterio; ninguna asignación de alcance se presenta como prueba.
- `E4.8-AC-17` (aviso en precierre): fuera de esta spec; requiere su propio gate en SPEC26.