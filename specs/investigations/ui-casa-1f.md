# Casa de cuentas 1F · Inversiones y Deudas

**Estado:** implementado en rama `feat/ui-casa-inversiones-deudas`; PR pendiente de aprobación.
**Base:** `test` con Casa 1A–1E y Graphite G3.

## Qué cambia

- `Inversiones.tsx` y `Deudas.tsx`: wrappers semánticos para listados y ficha; sin cambios de datos, columnas, acciones ni contratos.
- `casa.css`: listados editoriales, filtros en barra, tablas, tarjetas móviles, fichas con secciones planas y jerarquía Casa.
- Solo se aplica con `:root[data-theme="casa"]`.
- Se añade el escenario de test `casa-deudas` reutilizando la fixture C007.

## Pruebas

```text
bun test apps/web/test                119 pass
bun run typecheck                     exit 0
bun run build                         exit 0
playwright inversiones.spec.ts        1 pass
playwright casa-deudas.spec.ts        1 pass
```

`inversiones.spec.ts` verifica el listado y la ficha con Casa; `casa-deudas.spec.ts` verifica listado, ficha y 390 sin overflow.

Evidencia: `artifacts/e4-1/casa-listado-1440.png`, `artifacts/e4-1/casa-instrumento-1440.png`, `artifacts/ui-casa-deudas/deudas-1440.png` y `deuda-detalle-1440.png`/`390`.

## Límites

- No toca `Inicio.tsx`, `Movimientos.tsx` ni `Saldos.tsx`.
- No modifica la lógica financiera ni la semántica de importes.
- No fusionar sin aprobación.
