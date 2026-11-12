# Incremento 1A · Bloqueo de precheck

**Fecha:** 2026-11-10
**Estado:** **DETENIDO en comprobaciones previas. No iniciado.**
**Motivo:** la especificación UI vigente no autoriza un cuarto tema ni la modificación de
tokens/`theme-boot.js`; el Incremento 1A no puede ejecutarse hasta que esa spec se actualice y
ratifique.

## Evidencia

### Spec UI vigente

`specs/ui-specification.md` (también en `origin/test`):

- Estado: `[APROBADA] — ratificada formalmente por el usuario el 2026-11-06`.
- Temas: **Dark (`dark-s`), Light (`light-s`) y Hybrid (`hybrid-s`) cerrados** en `0b8aade`.
- «Paletas, tokens cromáticos y selector existentes **no se reabren**».
- Fuera de alcance: «cambios de color/tema … `UI · DEV` sin autorización».
- Contrato de temas (cerrado): los tres temas; el selector se conserva.
- **Prohibido:** «modificar paletas, tokens cromáticos, `theme-boot.js`, orden/identidad de los
  temas o el tema inicial (`dark-s`), que están cerrados».

El Incremento 1A autorizado por el usuario consiste precisamente en:

- añadir tokens Graphite en `themes.css`;
- registrar `graphite-lime` en `themes.ts`;
- ampliar `theme-boot.js`;
- añadir pruebas de catálogo/E2E.

Eso contradice la spec vigente. La autorización del usuario es una decisión nueva, pero la
propia instrucción exige revalidar la spec y detenerse si una condición no se cumple. La
condición no se cumple.

### Tablero y base

- `origin/test`: `18f7c0c` (2026-11-10 10:47), la base de integración más reciente.
- `origin/main`: `0d25be9` (2026-11-07 22:47), anterior.
- `feature/ui-premium-exploration`: `c0341d7`, **33 commits por delante de `origin/main`**;
  incluye trabajo funcional reciente (E4.5, auth, DEV-06 I4). **No se debe fusionar completa.**
- El tablero de `origin/test` indica UI DEV-01–DEV-07 integrados; el tablero local está
  desactualizado y aún dice DEV-04 I4 pendiente. No se aprecia un conflicto activo de DEV-04
  sobre los archivos de tema, pero la discrepancia debe reconciliarse antes de implementar.
- No se ha creado rama de implementación ni PR; no se ha modificado ningún archivo de la
  aplicación.

## Qué falta para desbloquear

1. **Actualizar `specs/ui-specification.md`** con una enmienda que:
   - añada `graphite-lime` como cuarto tema;
   - autorice tokens Graphite, catálogo, `theme-boot.js` y pruebas;
   - mantenga `dark-s` por defecto, `mf-theme` y los tres temas actuales;
   - declare 1A como implementación de tema, no como integración visual completa;
   - excluya 1B (`prefers-reduced-motion`) hasta coordinación con DEV-04.
2. **Ratificar la enmienda** por el usuario y reflejarla en el tablero.
3. Reconciliar el estado del tablero (local vs `origin/test`) y confirmar la rama base
   autorizada.
4. Reabrir 1A con una rama limpia desde la base autorizada; no portar la rama de exploración
   completa.

## Decisión

No se inicia 1A. No hay cambios funcionales, commits, merges ni despliegues. El checkout
permanece limpio.
