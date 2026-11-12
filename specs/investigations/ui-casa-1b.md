# Casa de cuentas 1B · Inicio editorial

**Estado:** implementado en rama `feat/ui-casa-1b`; pendiente de PR y aprobación.
**Base:** Casa 1A (`#364`), sin cambios de API, SQLite, Excel ni contratos.

## Qué cambia

- `Inicio.tsx` recibe la apariencia activa y, solo con `theme === "casa"`, renderiza una portada editorial:
  liquidez publicada, ciclo, número de Saldos y Pendientes, cobertura y dos acciones.
- El importe grande usa `Amount` con el valor y estado que ya publica `/api/resumen-inicio`; no hay sumas,
  totales ni métricas nuevas.
- `main.tsx` pasa la apariencia al componente.
- `casa.css` añade la composición 1B, toda bajo `:root[data-theme="casa"]`: portada, jerarquía,
  secciones sin tarjeta, tipografía, rejilla 2×2 y adaptación a 900/600 px.
- El resto de apariencias no renderiza la portada ni recibe los estilos.

## Pruebas

```text
bun test apps/web/test                         115 pass
bun run typecheck                              exit 0
bun run build                                  exit 0
bunx playwright test tests/e2e/inicio.spec.ts  6 pass
```

La prueba nueva comprueba la portada a 1440 y 390, el importe `3.456,40 €`, el ciclo 7, las acciones,
la ausencia de overflow y que la portada desaparece al cambiar a `light-s`. Evidencia:
`artifacts/ui-casa-1b/inicio-casa-1440.png` y `inicio-casa-390.png`.

## Límites

- Solo Inicio; no toca Movimientos, navegación, formularios ni otros componentes.
- No se modifica la semántica financiera: los `null` siguen siendo ND y no se crean totales.
- No se fusiona ni despliega sin aprobación.
