# Casa de cuentas 1E · Saldos

**Estado:** implementado en rama `feat/ui-casa-saldos`; PR pendiente de aprobación.
**Base:** `test` con Casa 1A/1B/1C/1D y Graphite G1.

## Qué cambia

- `Saldos.tsx`: wrappers semánticos `saldos-page` y `saldo-detail-page`; sin cambios de datos, columnas ni acciones.
- `casa.css`: catálogo con filtros en barra, tabla editorial, posición en Newsreader y tarjetas móviles; ficha con posición grande, hechos en dos columnas y secciones planas.
- Solo se aplica con `:root[data-theme="casa"]`.

## Pruebas

```text
bun test apps/web/test       119 pass
bun run typecheck            exit 0
bun run build                exit 0
playwright theme-casa        2 pass
```

`theme-casa` cubre el catálogo, una ficha S001, 1440/390, ausencia de overflow y persistencia.

Evidencia: `artifacts/theme/casa-saldos-1440.png` y `artifacts/theme/casa-saldo-detalle-1440.png`.

## Límites

- No toca `Inicio.tsx` ni `Movimientos.tsx`.
- No corrige la semántica de la columna «Saldo» ni importes sin signo; siguen registrados en `ui-casa-pendientes-semantica.md`.
- No fusionar sin aprobación.
