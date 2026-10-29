# Relay de auditoría — último mensaje

**N.º:** 0017
**De:** Álex (ChatGPT, auditor)
**Para:** OpenCode (coordinador)
**Tipo:** Autorización de desarrollo acotado de SPEC04 (SIN MERGE)
**Referencia:** AUDIT-04-25 / H-SPEC04-04, H-SPEC04-02, H-SPEC04-03
**Base cotejada:** `main` `1ed2a834334d94d121df82b77a497a35f75ec50a`
**Mensaje previo:** 0016
**Registro de auditoría:** `audit/spec04-25`, commit `feaa4cfa74a4840a03d6ca4bdd464523e89812ba`
**Autorización del usuario:** «ok» a la propuesta de alcance técnico SPEC04 presentada por Álex el 2026-10-29. Alcance aprobado: corregir tres defectos confirmados, pruebas focales y PR aislada para revisión independiente; **ningún merge**.

## Encargo aprobado

Implementa **exclusivamente** estos tres fixes relacionados de SPEC04 en una rama
aislada creada desde `main` actual. Debes comprobar el HEAD vigente
antes de escribir, coordinación/ownership de los archivos y ausencia
de escritores conflictivos. Conserva cualquier cambio remoto ajeno:
no sobrescribir ni forzar branches/commits.

**Prioridad 1 · H-SPEC04-04 (fuente instalada con error)**
- `apps/api/src/movimientos.ts` `plan/previewMovement/writeMovement`:
  cuando el contrato central `cycleContext(db).referencia.estado`
  sea `error`, mostrar fallo verificable durante la vista previa
  y bloquear transaccionalmente las confirmaciones de alta,
  rectificación y anulación que pretendan validar impacto.
- Preferir el patrón existente `409 REFERENCE_ERROR` usado
  en `ciclos.ts:477-485`. No confundir fuente **pendiente**,
  **no instalada**, **instalada vacía** y **instalada fallida**.
- Rechazo no consume ID, no deja cambios de Movimientos ni
  auditorías/intentos parcialmente escritos. Mantener garantías
  de idempotencia para respuestas repetidas ya confirmadas;
  no inventar un significado nuevo sin justificarlo.

**Prioridad 2 · H-SPEC04-02 (máximo temporal posterior)**
- Actualmente `movimientos.ts:751-806` calcula
  `referenciaDespues` solo a partir de fechas de
  Movimientos, omitiendo Comida vigente. Corregir el
  **agregado temporal** para reflejar todas las fuentes
  instaladas verificables tras la operación propuesta,
  incluidos casos de backdate y anulación del máximo.
- No inventar fechas de inversión si aún son fuente
  pendiente; evitar incluir anulados, reloj, Nómina
  o fecha técnica. El contexto actual seguirá siendo
  maestro único en `ciclos.ts`.

**Prioridad 3 · H-SPEC04-03 (huella de preview)**
- `financeRevision` de `movement-ledger.ts:69-145`
  excluye Revisión Comida; una modificación que cambia
  el impacto temporal puede pasar sin 409.
  Preferir huella **local de impacto temporal**
  en lugar de incorporar indiscriminadamente todos los
  registros Comida a la revisión financiera global.
- Vista previa/confirmación calculadas sobre estado
  coherente dentro de transacción. Si cambia materialmente
  el impacto aceptado, `409 IMPACT_CHANGED`,
  sin mutación; evitar invalidación innecesaria cuando
  los cambios de Comida no afectan el resultado relevante.
  Si no es posible garantizar una minimización segura
  sin ensanchar el alcance, documenta tradeoff y
  consulta antes de un rediseño general.

## Archivos y fronteras

**Archivo principal** `apps/api/src/movimientos.ts`.
Solo si es realmente necesario, pequeñas adaptaciones en
`apps/api/src/ciclos.ts`, `apps/api/src/revision-comida-ledger.ts`
u otro helper central ya existente para reutilizar fuentes.
Pruebas en `apps/api/src/movimientos.test.ts` y,
cuando aporte evidencia, prueba HTTP/E2E focal existente.

**Prohibido fuera de este alcance:** SPEC07/AC28, E3.5,
cierre financiero, inversión/suficiencia, cambiar semántica de
Presupuestos/Deuda/Anticipos/Compartidos, refactor general,
migración o esquema SQLite, Excel real, datos reales,
rootless/PR #30, VPS, cambios de producto ajenos, merges.

No cambiar los ID de los hallazgos:
- H-SPEC04-04 = bloqueo en error de fuente instalada.
- H-SPEC04-02 = referencia temporal posterior incompleta.
- H-SPEC04-03 = fingerprint no invalidado por Comida.

## Evidencia de aceptación obligatoria

Con fixtures falsos y base aislada:

1. **Fuente instalada en error:** preview y confirmación
   para alta/rectificación/anulación responden
   `409 REFERENCE_ERROR`; ninguna escritura/auditoría/ID
   consumidos. Control: Comida instalada vacía y ausente
   no se tratan como `error`; mismo caso en rutas HTTP
   con MFA/CSRF válidos cuando sea oportuno.
2. **Referencia anterior/posterior:** Comida ficticia
   posterior a Movimiento retroactivo conserva el máximo
   posterior; rectificación/anulación del máximo de
   Movimientos reevalúa correctamente la referencia
   conjunta; fechas civiles y efectos de ciclos se
   mantienen coherentes.
3. **Concurrencia:** Comida materialmente relevante se
   modifica entre preview/confirmación, con máximo
   constante o cambiante según caso; el intento antiguo
   devuelve `409 IMPACT_CHANGED`, sin escrituras.
   Control negativo de cambio sin impacto según el
   diseño que finalmente se justifique.
4. **No regresión:** reintento con misma clave/payload,
   `DUPLICATE_REVIEW`, intentos incompatibles,
   cambio de maestro, fecha Madrid/DST, acreencias/
   devoluciones y aportaciones, Compras y posición de
   efectivo, sin duplicaciones ni cambio de cifras.
5. Ejecutar pruebas focales y regresión pertinente,
   typecheck, build, CI Linux y E2E si está disponible.
   Reportar exactamente PASS/FAIL/UNRUN, SHA del HEAD,
   comandos y links a evidencia; no proclamar PASS
   por pruebas heredadas de otro SHA.

## Entrega esperada

- Crear **una PR de corrección SPEC04** desde la rama aislada
  cuando los cambios y pruebas autorizados estén preparados;
  documentar sus límites, diff, escenarios, riesgos y SHA.
  **PR lista para revisión de Álex**, sin auto-merge.
- El coordinador puede dirigir agentes implementadores
  conforme a su ownership, evitando escritores simultáneos.
- En caso de contradicción material, conflicto de escritores,
  rotura de tests o necesidad de cambiar contrato, **parar y
  consultar**, no ampliar el alcance unilateralmente.
- Responde en este relay como **0018**, con verificación SHA
  y vínculo de PR o bloqueo claro. No afirmes entrega
  terminada hasta verificaciones efectivas.
- **No** modifiques `audit/spec04-25`: el tracker de
  auditoría lo mantiene Álex por separado.

**Sin autorización de merge ni despliegue.**

## Acción solicitada

Ejecutar el desarrollo acotado aprobado en rama aislada y
preparar PR para revisión independiente.

**Listo - 0017**
