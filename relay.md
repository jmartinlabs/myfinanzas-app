# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 52
message_id: f9ced0bb-2c7f-4229-95f0-8a833d9de9fb
from: Alex
to: OpenCode
reply_expected: true
read_by: none
created_at: 2026-11-01T08:07:28.479Z

## Message

# PR #150 — segunda auditoría tras correcciones 0051 (tres hallazgos funcionales)

**De:** Alex (auditor) **Para:** OpenCode (coordinador)
**PR:** https://github.com/jmartinlabs/myfinanzas-app/pull/150
**HEAD auditado:** `0d720469830a2d3281057057f3e523c26fa5a523` (base `7dea0fdad7b9093dccfd950d041dcdcd3bf3d905`). PR OPEN, mergeable clean. `required` Linux PASS en ese HEAD, run `41286137608`. Se reconocen las correcciones previas: fecha Fin, ausencia de ID de efectivo fijo, huella del Plan, cobertura parcial y bloqueo cuando E4.1 falta. **Dictamen: no recomendar merge aún; quedan tres defectos económicos.**

## Correcciones focalizadas solicitadas, dentro de E4.8 DEV autorizado

1. **Cantidad escalada E4.1 mal presentada.** `apps/api/src/precierre.ts`, consulta de `investmentSource()` (`SUM(o.cantidad)`) devuelve enteros SQLite *escalados por 10^8*. La función retorna `row.cantidad` y `quantity.toString()` sin pasar por `quantityText`/`scaledText(...,QUANTITY_SCALE)` del motor E4.1. P.ej. `100000000` equivale a **1 unidad**, no 100 millones. El fixture AC-05 usa `100` y espera literalmente `"100"`, enmascarando el defecto. **Reutilizar formateador E4.1**, preservar BigInt exacto y modificar fixtures/assertions usando cantidades correctamente escaladas (una y varias posiciones, fracciones y el corte temporal).

2. **Posición agregada con clave errónea.** La nueva consulta agrupa por `o.instrumento,i.nombre`, pero SPEC19 §4.4 define la identidad de posición como **`saldo_inversion + instrumento`**. Un instrumento en dos Saldos se funde artificialmente. Devolver cada posición con ambos IDs, cantidad exacta y, si procede, nombre del saldo; mantener conteo de instrumentos distinto del número de posiciones. **No sumar cantidades de instrumentos distintos** en una sola cifra global carente de sentido económico. Probar mismo instrumento en dos Saldos con cantidades distintas, dos instrumentos diferentes y operaciones posteriores a Fin. No crear nuevo maestro ni persistir posición.

3. **Inactivación histórica ≠ inconsistencia.** `movementSource()` bloquea cualquier Movimiento vigente cuya Referencia o Partida esté **actualmente** `Inactiva`; en `precierre.ts` se añadió la condición `p.estado<>'Activa'`. Sin embargo, E1.2/spec02 conserva vínculos e IDs históricos y la creación/rectificación impide **nueva** selección de inactivos, pero puede conservar relaciones antiguas válidas. Comprobar también el caso equivalente de Referencia inactiva. **No bloquear un precierre antiguo únicamente por el estado actual**. Detectar solo incoherencia estructural/económica acreditada: ausencia de clave obligatoria, FKs/tipo incompatibles, violación real de clasificación según el contrato vigente; no inferir fecha de desactivación sin evidencia histórica. Prueba: registrar Gasto con Partida activa, desactivarla posteriormente (sin cambiar el hecho) y verificar que el precierre del ciclo no recibe bloqueo falso; mantener test negativo para incoherencia real.

## Alcance, QA y retorno

- Corregir sólo los puntos anteriores en el **DEV E4.8 de solo lectura**, añadir pruebas de regresión deterministas y revisar el testplan AC-04/05/06; no convertir un AC parcial en PASS sin cobertura.
- Ejecutar tests focales, typecheck, build, E2E funcional 390/1440 y CI en HEAD; devolver tabla concisa hallazgo → corrección → prueba → estado, SHA y riesgos.
- **Decisión del usuario sobre UI:** la **revisión/aprobación visual W1–W6 queda aplazada al final del proyecto**. No invertir ahora en perfeccionamiento visual ni utilizar la aprobación estética como gate de merge; la UI sigue provisional, *no aprobada*. Conservar requisitos funcionales mínimos, navegación, accesibilidad y no overflow grave.
- No se autoriza merge, E4.9, despliegue, migración, uso de datos reales ni ejecución de backup/restore; DT6 aparcado, FIN_NETA no disponible. Si una corrección exige una decisión semántica financiera nueva, proponerla sin asumir aprobación.

**Relación con relay:** es una segunda revisión de PR #150 posterior al mensaje 0051. El último mensaje 0051 aún constaba sin `read_by`; se complementa su contenido, no se asume lectura ni aceptación por OpenCode.
