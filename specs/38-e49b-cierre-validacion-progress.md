# 38 — Cierre de validación operativa con recálculo vivo: Progress

Status: **I1 implementado y en revisión.** SPEC38 v7
([aprobada](38-e49b-cierre-validacion-specification.md) el 2026-11-20, 57 AC) y su
[anexo de interfaces](38-e49b-cierre-validacion-interfaces.md) aprobados el mismo día, con la
sustitución de SPEC26/27/28/29 registrada. PR:
[#553](https://github.com/jmartinlabs/myfinanzas-app/pull/553).

Base medida: `test` `aa50a6eb`, esquema **v31** → **v32** tras I1. Rama
`feat/547-i1-esquema-v32`. Datos reales fuera de alcance.

| Incremento | Estado | Evidencia |
| --- | --- | --- |
| **I1 · Esquema v32 + DTO + importación conservadora** | **implementado / en revisión** | `cierre-validacion-schema.ts`, `cierre-validacion-dto.ts`, `cierre-validacion-migracion.ts`, contrato `C32-SPEC38-VALIDACION-CIERRE`, `cierre-validacion-{schema,dto}.test.ts` |
| **I2 · Lectores, escritores, UI y guardas** | **no iniciado** | requiere preview/confirmación, informes vivos y retirada funcional legacy |
| **I3 · Retirada física (#548)** | **no iniciado** | bloqueado por G1 (esta Issue implantada y aceptada) y por la enmienda de SPEC30 |
| **I4 · Documentación** | **no iniciado** | — |

## I1 · contenido entregado

- **Migración aditiva v31 → v32**: `cierre_validacion`, `cierre_validacion_audit`,
  `validacion_attempts` y 21 triggers de integridad. No modifica tablas existentes ni retira
  ninguna.
- **DTO de auditoría en dos capas**: constructor central con lista blanca,
  `additionalProperties:false` y rechazo mecánico de todo `number` JSON —revisiones e
  identificadores viajan como texto decimal canónico y se validan además en semántica—, más
  triggers `json_each`/`json_tree` en la base. `hechos`, `ciclos`, `cobertura`, `procedencia`.
- **Importación conservadora**: todo cierre legado entra como `Pendiente` (`dirty=1`,
  `accion='migracion'`, `origen='MIGRACION:cierres:<ciclo>'`, `motivo=null`, procedencia
  completa, huellas nulas). **Cero validaciones limpias inventadas.** Idempotente por
  tabla+PK, sin sobrescribir filas humanas.
- **Contrato `C32`** registrado y `SUPPORTED`/`admitted`/`appLabels` ampliados: una base v31
  sigue abriéndose con el binario nuevo y una v33 se rechaza sin escribir.

## Evidencia ejecutada

Medida por el coordinador sobre `feat/547-i1-esquema-v32` (`5f8f2c00`) y sobre la base
`aa50a6eb`, en worktrees separados con `bun install --frozen-lockfile`.

| Check | Resultado |
| --- | --- |
| `bun run typecheck` | **PASS** (exit 0) |
| `bun test apps/api/src/cierre-validacion-{dto,schema}.test.ts` | **28 pass · 0 fail · 332 aserciones** |
| `bun test apps/api` (rama) | 1269 pass · 11 skip · **58 fail** · 1338 tests |
| `bun test apps/api` (base `aa50a6eb`) | 1241 pass · 11 skip · **58 fail** · 1310 tests |
| Diferencia | **+28 pass = los 28 tests nuevos**; el conjunto de fallos **no crece** |
| CI de la PR #553 | `required` **pass**, `CI profile: fast` **pass** |

Los 58 fallos son **preexistentes y ambientales**: `safeAncestors` rechaza ancestros de root y
`process.getuid` es función en Bun (toda ruta `production`/`backup`), `restore-server.ts`
exige `libc.so.6` (Linux) y `server-config` encuentra el puerto de salud ocupado. Se
reprodujeron idénticos en la base, sin tocar esos caminos.

## Lo que este incremento NO acredita

Los 57 AC de SPEC38 siguen **UNRUN**: I1 entrega esquema, DTO y migración, no las rutas,
informes vivos, preview/confirmación ni la retirada funcional legacy. Ningún AC se declara
cumplido por este incremento.
