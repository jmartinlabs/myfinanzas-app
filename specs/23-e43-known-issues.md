# E4.3 — Known issues

## KI-409-01 — Editar el borrador tras un 409 reactivaba Guardar (menor)

- **Estado:** corregido en la rama `fix/e43-409-stale`; pendiente de CI y merge.
- **Síntoma:** tras un `REVISION_CONFLICT`, el panel mostraba las diferencias y bloqueaba
  Guardar, pero al editar cualquier campo `changed()` limpiaba el estado `stale` y ocultaba
  el panel; Guardar volvía a habilitarse sin completar la confirmación explícita.
- **Impacto:** la API seguía rechazando la revisión obsoleta; no había pérdida de datos, pero
  la interfaz permitía un intento inadvertido de sobrescritura y perdía la elección segura.
- **Causa:** el panel de conflicto estaba dentro del bloque condicionado por `error`, y
  `changed()` limpiaba `error` y `stale`; además la casilla de confirmación no se reiniciaba.
- **Corrección:** el panel de conflicto se mantiene con `stale`/`conflict`, Guardar sigue
  bloqueado, editar reinicia la casilla de confirmación y la lista se etiqueta como
  “diferencias detectadas al recibir el 409”.
- **Regresión:** E2E modifica el precio después del 409, comprueba que el panel sigue visible,
  la casilla vuelve a desmarcarse y Guardar permanece deshabilitado; después prueba el
  descarte seguro y el guardado con revisión vigente.
- **Límite:** no reabre DEV E4.3 ni cambia contrato; solo endurece la UI.
