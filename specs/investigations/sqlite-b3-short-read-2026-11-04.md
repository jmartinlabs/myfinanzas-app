# SQLite B3 — investigación del flake `SQLITE_IOERR_SHORT_READ` (2026-11-04)

**Estado:** investigación acotada completada; **flake NO resuelto y NO declarado PASS.** Sin
cambios de código. Worktree limpio. La reproducción fiel en Linux queda **UNRUN**.

## Síntoma

`apps/api/src/sqlite-opening.test.ts:288` (`SQLite B3`) falla de forma intermitente en la
reapertura del proceso padre con `SQLITE_IOERR_SHORT_READ` (errno 522), en la primera lectura
de la conexión nueva. En `main` la primera lectura es `verifyAdmittedContract`
(`private-state.ts` → `schema-contract.ts`); la traza histórica la sitúa en
`inspectIdentity`. No hay corrupción: lecturas posteriores e `integrity_check` son correctas.

## Evidencia

- Run histórico `40076614284` (dev09): B3 FAIL con `SHORT_READ`.
- Run `40079319881` (mismo código): B3 PASS → no determinista.
- 40 runs recientes (31-oct → 03-nov): ninguno con `SHORT_READ`.
- macOS: ~46 ejecuciones reales de B3 (con shim temporal para `renameat2` y con SQLite
  3.53.4 compilada) → **0 fallos**. No se reproduce en APFS/Bun macOS.
- Suite completa macOS: B3 PASS en 3/3; los 2 fallos son de plataforma (`/proc`, borrado).
- `bun run typecheck`: PASS.

## Hipótesis

1. **Principal:** estado residual WAL/SHM o VFS indexado por inodo del proceso padre tras
   `initializeProduction()` sobre el mismo inodo, con `-shm` borrado/recreado. Encaja con que
   B4 se aislara en proceso hijo tras el mismo `SHORT_READ`.
2. **Abierta:** colisión de inodo con una conexión filtrada de otro test (solo suite completa,
   Linux/ext4); no hay evidencia directa.
3. **Descartadas:** checkpoint concurrente (no hay escritor vivo), base truncada/corrupta,
   `close()` diferido con sentencias vivas.
4. **Abierta menor:** I/O transitorio del runner.

## Candidato no aplicado

Aislar la inicialización de B3 en un proceso hijo, como B4, sin tocar aserciones. No se aplica
porque no hay causa estable ni reproducción Linux; un CI verde no demostraría resolución.

## Siguiente acción

En un runner Linux, repetir B3 50 veces sin reintentos y la suite completa, con instrumentación
de `sqlite_version()`, `dev/ino/size` de `.sqlite/-wal/-shm`, `/proc/self/fd` y `strace` de
`openat/read/pread64/ftruncate/unlink`. Solo entonces decidir el candidato B4-style y su QA.
