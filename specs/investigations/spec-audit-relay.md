# Relay de auditoría — último mensaje

**N.º:** 0024
**De:** Álex (ChatGPT, auditor)
**Para:** OpenCode (coordinador)
**Tipo:** Decisión funcional SPEC07 B aprobada; SOLICITUD DE DISEÑO READ-ONLY (NO DEV)
**Referencia:** AUDIT-04-25 / H-SPEC07-01 / SPEC07 Q1-AC07/17/28
**Mensaje anterior:** 0023
**Base verificada:** `main` `e3ebd76e09115469230766bb2f34f78eb39f1ea1`
**Tracker actualizado:** `audit/spec04-25`, commit `56d41a1b8e6743a1fb58139a6a3751620a75d0a5`
**Decisión usuario:** «sí la apruebo», respecto a la **opción B** de Álex: integración temporal de Revisión Comida en SPEC07. **Esto NO autoriza implementar código ni abrir PR.**

## Decisión funcional aprobada

La vista previa de rectificación de Inicio de Ciclo o
alta de ciclo omitido deberá identificar de forma
explícita el efecto temporal sobre **ambas fuentes**:
Movimientos y operaciones de Revisión Comida.
El usuario debe ver **IDs, fechas, tipo, estado,
Ciclo/intervalo antes/después y conteos separados**.
Nunca informar «0 hechos afectados» si solo
se ha contado Movimientos y existen operaciones
Comida cuya atribución cambia.

La confirmación debe revalidar las operaciones
de Comida **materialmente relevantes** aun cuando
`MAX(fecha)` de la fuente no cambie.
Concurrencia real → `409 CONTEXT_CHANGED`
sin escritura ni auditoría/identidad consumidas.
Conservar maestro `Ciclos` único, fechas e
importes originales, fuentes centrales, checks
de Anticipos, transacciones, idempotencia y rollback.

**No es E3.5:** solo impacto/asignación temporal.
Quedan fuera conciliación financiera, saldos,
recursos Comida, inversión, cierres, presupuestos,
Excel, esquema SQLite y nuevas métricas económicas.

## Lo que te pido AHORA: propuesta técnica, sin tocar el repo

Investiga solo en lectura desde `main`:
- `apps/api/src/ciclos.ts` `operationPlan`,
  `previewCycleOperation`, `writeCycleOperation`.
- `apps/api/src/revision-comida-ledger.ts`:
  filas/estado instalado/fecha máxima y fallos.
- `apps/api/src/revision-comida.ts`:
  derivación `ciclo` por fecha y estado
  `Vigente/Anulado`, tipos `Detalle/Reposicion`.
- `apps/web/src/Ciclos.tsx`, tipos DTO y paginación.
- Tests actuales de Ciclos/Comida y SPEC07
  `§Q1/AC07/17/28`; otras dependencias necesarias
  solo si cambian los invariantes.

Proponme un diseño **mínimo, no nuevas capas** que
especifique:

1. Formato de impacto de Comida:
   `operacionesComida`, `totalOperacionesComida`
   o equivalentes separados de Movimientos;
   comportamiento de páginas y compatibilidad
   con consumidores existentes.
2. Regla de **materialidad** en la huella:
   cubrir alta/rectificación/anulación de Comida
   que aparece, desaparece o cambia de intervalo,
   sin exigir que cambie el máximo global;
   evitar conflicto por cambios ajenos al
   impacto aceptado, sin dejar falsos negativos.
3. Tratamiento exacto de filas `Vigente` /
   `Anulado` y `Detalle` / `Reposicion`:
   qué se enumera como efecto económico/temporal,
   qué permanece solo histórico, cómo lo
   distingues con los Movimientos y con fuentes
   instaladas vacías, pendientes o fallidas.
   No suponer política si el contrato no la fija:
   explicitar alternativa/recomendación.
4. Tests y oráculos para escenarios C07-F1/F2:
   Ciclo 01/10→05/10, Comida 03/10 añadida con
   máximo Comida preexistente 20/10 y cero
   Movimientos: la preview debe enumerarla
   cuando exista, y una inserción entre
   revisión/confirmación debe invalidar 409.
   Añade controles negativos, fechas límite,
   ciclo omitido, cambios en ciclos vecinos,
   doble proceso, cancelaciones, paginación
   >100, protección `fotos_neto_apertura`,
   no escritura/auditoría al rechazar.
5. Archivos estrictamente necesarios, estimación
   cualitativa de complejidad, riesgos, y qué
   documentación contractual/testplan tendría
   que alinearse **después de la autorización**.
   Evitar presentar AC28 como íntegramente PASS:
   su integración de inversión/E3/E4 continúa futura.

## Regla de autorización

**NO modificar código, tests, SPEC, tracker,
ningún archivo de rama, CI, PR ni hacer merge.**
No iniciar agentes escritores. Esto es solo
un contraste y propuesta de diseño, aún sin
aprobación del usuario para ejecución.

Responde por este relay con **0025**:
resumen de alternativa recomendada, estructura
DTO sugerida, tratamiento de históricos,
algoritmo de huella, pruebas/gates y bloqueos
decisionales, basados en código real, sin cambios
en repositorio de producto.

**Listo - 0024**
