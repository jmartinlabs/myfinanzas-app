# Casa de cuentas 1D · Detalle y formularios de Movimientos

**Estado:** implementado en rama `feat/ui-casa-mov-detalle`; PR pendiente de aprobación.
**Base:** `test` con Casa 1A, 1B y 1C integradas.

## Qué cambia

- `casa.css` compone el detalle (`movement-detail`) y el formulario (`movement-form-page`) reutilizando `FormSection`, `FormGrid`, `Field`, `Table` y los comportamientos existentes.
- Detalle: dos columnas de hechos, tipografía editorial, hechos con reglas finas, auditoría plana y acciones existentes.
- Formulario: secciones sin tarjeta, etiquetas mono a 12 px, controles de 44 px, rejilla de dos columnas y footer de acciones existente.
- Se añade solo un wrapper semántico `movement-form-page`; no se cambian campos, validaciones, cálculos, signos, tipos ni contratos.
- Solo se aplica con `:root[data-theme="casa"]`.

## Pruebas

```text
bun run typecheck                               exit 0
bun run build                                   exit 0
playwright casa-movimientos.spec.ts             1 pass
```

El test recorre listado, detalle de #9, rectificación, 1440/390, sin overflow y sin errores de consola.

Evidencia: `artifacts/ui-casa-1d/detalle-casa-1440.png`, `formulario-casa-1440.png` y `formulario-casa-390.png`.

## Límites

- No toca `Inicio.tsx`; OpenCode puede continuar con Inicio y Graphite.
- No corrige la columna «Saldo» ni los importes sin signo: quedan registrados para revisión semántica posterior.
- No fusionar sin aprobación.
