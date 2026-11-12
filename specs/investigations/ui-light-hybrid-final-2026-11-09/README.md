# Light / Hybrid · prototipos finales de fase C

**Estado:** archivo documental y de prototipos. **No es código de producción.**
**Origen:** `artifacts/ui-premium/phase-c/final/` (ruta ignorada por Git), rama
`feature/ui-premium-exploration`, prototipos fechados el 2026-11-09.
**Archivado:** 2026-11-12 bajo [#402](https://github.com/jmartinlabs/myfinanzas-app/issues/402).
**Alcance:** Inicio y Movimientos en Light y Hybrid a 1440. **Dark no se modificó.**

## Por qué existe

El rescate de Light/Hybrid no era reproducible: las fuentes de `final/` solo vivían en una ruta
ignorada por Git y no estaban en el manifiesto del release `graphite-lime-design-2026-11-10`.
Este directorio conserva las fuentes, la documentación y la evidencia visual para poder revisar
y, en su caso, integrar el diseño sin depender de un worktree local.

## Contenido

| Ruta | Qué es |
| --- | --- |
| `final/inicio-light.html`, `final/inicio-hybrid.html` | Prototipos de Inicio (`?theme=light-s` / `hybrid-s`). |
| `final/movimientos-light.html`, `final/movimientos-hybrid.html` | Prototipos de Movimientos. |
| `final/final.css`, `final/movimientos-final.css` | Tratamiento propio de Light/Hybrid. |
| `final/comparativa-*.html` | Tableros antes/después y familia Dark/Light/Hybrid. |
| `final/tokens.md`, `final/README.md` | Tokens, superficies y decisiones de la fase final. |
| `final/qa-report.md`, `final/qa-report.json`, `final/qa.mjs` | QA de la matriz de prototipos. |
| `final/shots/` | 18 pantallas y 8 tableros en JPEG (ver estrategia). |
| `tokens.css`, `base.css`, `icons.css`, `inicio.css`, `movimientos.css`, `app.js` | Base compartida de fase C que consumen los prototipos. |
| `refinement/refinement.css` | Segunda iteración de Light/Hybrid que referencian los HTML. |
| `MANIFEST.sha256` | Hashes de este archivo. |
| `RAW-MANIFEST.sha256` | Hashes de los 47 archivos originales, antes de normalizar. |

## Estrategia de conservación

- **En Git:** 21 fuentes (240 KB) + 26 capturas JPEG 1× + base compartida. Pantallas a 1440 px
  de ancho máximo y calidad 82; tableros a 2800 px y calidad 80.
- **Cambios de normalización respecto al original:** en los 8 tableros se reescribieron las
  referencias `shots/*.png` a `shots/*.jpg`, y en `final/README.md` los tres enlaces
  `../candidates/README.md` apuntan ahora al archivo de candidatos de
  `graphite-lime-design-2026-11-10`. El resto de fuentes es idéntico; `RAW-MANIFEST.sha256`
  permite comprobarlo.
- **Fuera de Git:** los PNG 2× originales (42 MB) permanecen intactos en
  `artifacts/ui-premium/phase-c/final/`. No se han borrado ni modificado.
- **No se duplica** la base de fase C ya archivada en
  [`graphite-lime-design-2026-11-10`](../graphite-lime-design-2026-11-10/README.md): se copia
  solo lo que estos prototipos necesitan para abrirse solos.

## Cómo verlo

Abrir `final/inicio-light.html` o `final/inicio-hybrid.html` en el navegador. El selector de la
cabecera cambia entre `dark-s`, `light-s` y `hybrid-s`; también se puede fijar por URL con
`?theme=light-s`. Los tableros comparativos se abren igual desde `final/comparativa-*.html`.

Las páginas son estáticas salvo tema, menú móvil, selección y filtros demostrativos: no hay API,
autenticación ni persistencia. Los datos son sintéticos.

## Límites

- No es una integración: `apps/web`, la API, SQLite y los tokens de producción no se tocan.
- Dark se mantiene como referencia sin cambios.
- El diseño final solo está resuelto a 1440; 820/390 y los estados siguen en la versión de fase C.
- No se declara auditoría WCAG completa: el QA del prototipo comprueba overflow, contraste de
  parejas de tokens, tipografía mínima y objetivos táctiles.
- Los importes con signo y color del prototipo de Movimientos no son un contrato: la API no
  publica dirección (ver [#421](https://github.com/jmartinlabs/myfinanzas-app/issues/421)).

## Siguiente paso

La propuesta de incrementos y las decisiones pendientes (composición compartida, alcance de la
capa de identidad y detalle de Movimientos) están en el informe de
[#402](https://github.com/jmartinlabs/myfinanzas-app/issues/402#issuecomment-6826844241).
