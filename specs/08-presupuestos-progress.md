# 08 — E2.2 Presupuestos: progreso de desarrollo

Estado: **INTEGRADO — PR #44 (`255bf61`)**. Nota de vigencia 2026-10-29: el estado
anterior («candidato verificado; pendiente de aprobación de merge») es histórico.
Fecha: 2026-10-23 (Europe/Madrid). Rama `feat/08-presupuestos`; base main `ca5de20`.
Autorización: «Álex — Autorización de desarrollo E2.2 · `$dev 08`» (registrada en el
[tablero](epic-board.md)). No autoriza merge, despliegue, Excel real ni E2.3.

## Historia de la entrega

1. **WIP `010b8fa`** (otro entorno, interrumpido por límite de uso): maestro, migración v8,
   relación Partida→Presupuesto, API, UI y escenarios E2E escritos sin validar.
2. **Retomado en Claude Code**: worktree aislado, merge de main `ca5de20` (`9ddc7e0`) sin
   conflictos.
3. **`d57fb0a`**: fixture v7 privada desde la primera apertura (B7 fallaba en CI por
   sidecars 0644 bajo umask 022; mismo patrón que `openDatabaseV6`).
4. **`c7e8bd3`**: formato Prettier 3.6.2 por defecto en los archivos TS/TSX/CSS de dev08
   (main ya cumplía ese formato); texto E2E «Sin Presupuesto» (AC-06).
5. **`a112b6d`**: `aria-label` en los select de formulario y filtros, botón real «Crear
   Partida» y estado de carga con puerta + `fallback` en E2E.
6. **`f82064b`**: inspección visual 390/1440 — botones secundarios, margen del listado y
   mensajes «máximo 120/2000».
7. **`84078b2`**: hallazgos menores QA08-1 — «Actualizar contexto» tras 409 sin perder
   borrador, «Limpiar filtros» con Estado, pruebas B9 (AC-15) y backup v8 ajeno en B8.
8. **`2880f98`**: decisión del usuario 2026-10-23 — cambiar la fuente con un destino ya
   inactivo es nueva relación y exige Saldo activo; solo renombrar conserva el destino.

## Decisiones de esta entrega

- Decisión del usuario (2026-10-23, literal): «Sí: cambiar la fuente con un destino ya
  inactivo cuenta como nueva relación y debe exigir un Saldo activo; solo renombrar
  conserva el destino inactivo.»
- Migración v8 propia con contrato `e2.2-presupuestos-v8`; una v8 ajena (p. ej. el
  esquema8 de dev07, fuera de main) se rechaza sin modificar la base. Integrar dev07 en el
  futuro exigirá diseñar y revalidar la reconciliación de ambas migraciones.
- Cambios de Presupuesto con hechos registrados quedan bloqueados (HISTORY_LOCKED) hasta
  E2.3; no se estima impacto.

## Fuera de alcance y pendientes

F-01/F-02 futuros; E2.3, Base/Esencial/Del mes, ejecución y estados mensuales fuera.
AC23/E2.1 sigue BLOQUEADO y Dev32 PAUSED; no se modificó el motor de apertura SQLite.
Evidencia y limitaciones: [testplan08](08-presupuestos-testplan.md).
