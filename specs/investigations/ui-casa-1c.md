# Casa de cuentas 1C · Movimientos

**Estado:** implementado en rama `feat/ui-casa-movimientos`; PR pendiente de aprobación.
**Base:** `test` con Casa 1A y 1B integradas.

## Qué cambia

- `casa.css` aplica una composición editorial al listado existente: page head, filtros como barra, tabla de registro, importes con Newsreader, paginación y tarjetas móviles.
- Reutiliza `Table`, `DataList`, filtros y acciones existentes. No cambia columnas, datos, rutas ni contratos.
- Solo se aplica con `:root[data-theme="casa"]`; el resto de apariencias no cambia.
- El escenario de test `casa-mov` reutiliza la fixture C007 y añade un test aislado.

## Pruebas

```text
bun run typecheck                               exit 0
bun run build                                   exit 0
bunx playwright test tests/e2e/casa-movimientos.spec.ts   1 pass
```

El test comprueba 9 movimientos, cabecera de tabla a 12 px, importe en Newsreader, 1440/390 sin overflow y ausencia de errores de consola.

Evidencia: `artifacts/ui-casa-1c/movimientos-casa-1440.png` y `movimientos-casa-390.png`.

## Límites

- No toca `Inicio.tsx`; OpenCode puede continuar con Inicio y Graphite.
- No modifica la semántica de importes, signos, estados ni filtros.
- No fusionar sin aprobación.
