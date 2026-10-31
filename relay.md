# Agent Relay
conversation: r-syna73hk
description: MyFinanzas: entrega COMIDA-UNICO-01 y D′ — handoff para Alex
type: message
state: open
participants: coordinator-opencode, Alex
sequence: 6
message_id: 5c5029c5-6f6d-40a2-bb56-b547026c8220
from: coordinator-opencode
to: Alex
reply_expected: false
read_by: none
in_reply_to: 5
created_at: 2026-10-31T19:03:02Z

## Message

HANDOFF -> ALEX | MyFinanzas responsive 390 | diagnóstico y propuesta

Estado: DIAGNÓSTICO READ-ONLY COMPLETADO. Sin cambios de código, sin PR, sin implementación.

1. Evidencia reproducida (fixtures ficticios, 390x844)
- Comida: `document.documentElement.scrollWidth=540`, viewport 390. Único desbordamiento: `table.table` de Operaciones (ancho 507 + contenedor; caption/thead/tbody). 4 filas.
- D′: `scrollWidth=838` al abrir la ficha de planificación. Único desbordamiento: `table.table` de líneas previstas (ancho 805; 6 columnas con inputs/select). Maestro, lista de planificaciones y mensual no desbordan en ese estado.
- 1440: ambas caben; no hay overflow.

2. Causa
No existe contenedor responsive ni regla `.table`; las tablas usan ancho intrínseco. En Comida son 8 columnas de datos; en D′ la tabla de líneas incluye 6 columnas con controles de formulario. El `form-grid` sí colapsa a 1 columna a 760, pero la tabla no.

3. Propuesta mínima (una sola PR)
Primitivo compartido `TableScroll` en `apps/web/src/ui.tsx`:
- wrapper `div.table-scroll` con `role="region"`, `aria-label`, `tabIndex={0}`, `overflow-x:auto`, `overscroll-behavior-x:contain` y foco visible;
- se envuelven: tabla de Operaciones en `Comida.tsx`; tablas de Maestro, planificaciones, líneas de ficha y mensual en `Dprima.tsx`;
- CSS en `style.css` con `max-width:100%`, sin `overflow:hidden` global;
- a 390 el scroll horizontal queda dentro del wrapper (página a 390); a 1440 no cambia el layout.
Alternativa descartada: forzar `table-layout:fixed`/wrap de importes (degrada legibilidad y formularios). Alternativa futura: tarjetas móviles o editor de líneas en grid, más costosa y con más superficie de regresión.

4. Riesgos y mitigación
- Scroll horizontal poco evidente: etiqueta de región, foco visible y barra nativa; opcional indicador “desplaza para ver más”.
- Doble scroll/trampa de teclado: solo el wrapper es tab stop; no se capturan flechas.
- 1440: wrapper al 100%, sin cambios visuales; comprobar que no aparece scroll interno.
- Formularios: inputs siguen accesibles al desplazar; no se ocultan columnas.

5. Pruebas E2E del arreglo
- 390 Comida: página `scrollWidth<=390+1`; wrapper existe, es focusable y `scrollWidth>clientWidth`; tras foco y flecha derecha/scroll, la última columna y acción son visibles/alcanzables.
- 390 D′: abrir ficha; mismas aserciones sobre la tabla de líneas; comprobar inputs editables tras desplazar.
- 1440: página sin overflow; wrapper `scrollWidth<=clientWidth` (sin scroll interno).
- Regresión: E2E focal, suite E2E completa, typecheck/build; capturas 390/1440.
- Sustituir anotaciones `known-issue` por aserciones reales; actualizar testplans.

6. Prioridad y alcance
- Prioridad media; D′ (805 px, formulario) algo más crítico que Comida (507 px, lectura).
- Una PR es suficiente: mismo primitivo y causa; dos PR solo si se quiere rollback independiente por pantalla.
- Bloqueos: ninguno técnico. Requiere autorización humana para editar UI/tests y publicar PR; después, autorización separada de merge. Sin cambios de esquema, lógica financiera, gate rootless, datos ni activación.

Restore de aplicación v19/v20 en Linux sigue como tarea separada.
