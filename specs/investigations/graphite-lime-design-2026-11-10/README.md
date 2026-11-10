# Graphite Lime · archivo de diseño

**Estado:** archivo documental y de prototipos. **No es código de producción.**
**Fecha:** 2026-11-10.
**Decisión:** Graphite Lime (`graphite-lime`, «Grafito») fue aprobado como cuarto tema y
candidato prioritario de integración visual.

## Propósito y estrategia de conservación

Este directorio preserva los prototipos, documentación, QA y evidencia visual que vivían bajo
`artifacts/ui-premium/phase-c/candidates/`, una ruta ignorada por Git. La entrega inicial tenía
**133 archivos y ~64 MB** (73 PNG 2× y 60 archivos de texto). La revisión reduce el peso sin
perder las fuentes ni la evidencia esencial:

- **En Git:** **140 archivos, ~17 MB**. Incluye 79 capturas JPEG 1×, fuentes HTML/CSS/JS,
  documentación, QA, tableros comparativos y manifiestos.
  - Pantallas: JPEG a 1440 px de ancho máximo.
  - Tableros: composición completa, limitada a 2800 px de ancho para conservar legibilidad.
  - Calidad JPEG: 82 en pantallas, 80 en tableros.
- **Fuera de Git:** los originales 2× y las fuentes del conjunto archivado permanecen intactos
  en `artifacts/ui-premium/phase-c/`: **137 archivos, ~74 MB**, incluidas las seis referencias
  de comparación. No se han borrado ni modificado.
- **Conservación duradera publicada:** los originales están empaquetados como activo de la
  GitHub Release [`graphite-lime-design-2026-11-10`](https://github.com/jmartinlabs/myfinanzas-app/releases/tag/graphite-lime-design-2026-11-10):
  `graphite-lime-phase-c-raw-2026-11-10.tar.gz` (~75 MB) y su archivo `.sha256`.
  - SHA-256 del bundle: `86f14cf90cfb0864b581b63829ea409a77949dfe11f23bd5f6928f521b0361ae`
  - Descarga verificada: 137 archivos, hashes coincidentes con `RAW-MANIFEST.sha256`.
  - No se añade al historial de Git. Los originales locales se conservan.

El objetivo es que el repositorio conserve lo necesario para revisar el diseño y que los
originales 2× tengan una ubicación duradera, sin duplicar ~74 MB en cada clon.

## Contenido

- `phase-c/` — CSS/JS compartidos que consumen los prototipos (`tokens.css`, `base.css`,
  `inicio.css`, `movimientos.css`, `estados.css`, `icons.css`, `app.js`).
- `phase-c/shots/` y `phase-c/final/shots/` — seis capturas de referencia de Dark, Light y
  Hybrid usadas por los tableros de comparación.
- `phase-c/candidates/` — HTML, CSS, JS, documentación, QA, tableros y capturas de los temas
  candidatos:
  - Inicio: `inicio-candidatos.html` y `shots/`.
  - Movimientos: `movimientos-candidatos.html` y `shots-movimientos/`.
  - Estados y formularios: `estados-candidatos.html`, `formularios-graphite.html`,
    `shots-estados/` y `shots-formularios/`.
  - Evidencia de accesibilidad: `shots-graphite-a11y/`.
  - Documentación: `README.md`, `README-movimientos.md`, `README-graphite-final.md`,
    `README-integracion.md`, `qa-*.md`, `incremento-1-propuesta.md`,
    `incremento-1-bloqueo.md`, catálogo, inventario, riesgos y plan.
- `MANIFEST.sha256` — SHA-256 de los archivos del archivo documental, excepto él mismo.
- `RAW-MANIFEST.sha256` — SHA-256 de los 137 originales 2×, con rutas relativas a
  `artifacts/ui-premium/phase-c/`.

## Corrección del fixture sintético

La revisión contrastó los datos con las especificaciones vigentes y corrigió dos filas del
prototipo archivado. **No se alteraron importes, fechas, IDs, número de filas, KPI ni
totales**; una comprobación automática confirma el mismo multiconjunto de importes y los
mismos recuentos de filas antes y después.

| Fila | Antes | Después | Motivo |
| --- | --- | --- | --- |
| `#315 · Cuota préstamo vivienda` | `Amortización deuda` · `Deuda` | `Gasto` · `Ordinario` (etiqueta de clasificación del prototipo, no un Subtipo persistido), partida `Préstamo vivienda` | SPEC06 define la cuota ordinaria como `Gasto` con capital e intereses; `Amortización deuda` queda para amortizaciones extraordinarias y no lleva Subtipo. Se conserva `-742,18 €`. |
| `#314 · Devolución seguro hogar` | `Devolución de gasto` · `Recuperación` | `Ingreso` · `Intereses`, concepto `Intereses cuenta`, partida `No aplica` | El prototipo genérico de Movimientos usa los tipos base; no se presenta una devolución como tipo genérico. El tipo especializado `Devolución de gasto` sigue en su contrato específico (SPEC16) y en la aplicación; este archivo no lo reabre. Se conserva `+48,50 €`. |

Consecuencias en el fixture:

- `Devolución de gasto` se retiró del filtro y del formulario de ejemplo del prototipo
  genérico de Movimientos.
- `Amortización deuda` sigue disponible como tipo para pagos extraordinarios de deuda.
- El cambio se aplicó solo a la copia archivada. Los originales de `artifacts/` no se tocaron.

Por eso, las entradas de `app.js`, `movimientos-candidatos.html`, `inicio-candidatos.html` y
`estados-candidatos.html` del `RAW-MANIFEST.sha256` corresponden al fixture original y no a la
copia corregida. Es intencional: el manifiesto crudo conserva la instantánea 2× intacta.

## Cómo abrir los prototipos

Los HTML conservan sus rutas relativas (`../tokens.css`, `candidates.css`, etc.). Pueden
abrirse como archivos estáticos; no hay API ni persistencia real.

Puntos de entrada:

- `phase-c/candidates/inicio-candidatos.html?theme=graphite-lime`
- `phase-c/candidates/movimientos-candidatos.html?theme=graphite-lime`
- `phase-c/candidates/estados-candidatos.html?theme=graphite-lime`
- `phase-c/candidates/formularios-graphite.html`

Los prototipos usan datos exclusivamente sintéticos.

## Relación con la integración

- La enmienda documental UI-G1 y la autorización de 1A están en la PR #353, fusionada en
  `test` (`64c0335`).
- 1A (tokens/catálogo/boot) se fusionó en `test` con la PR #356 (merge commit `bff714e`;
  commit de la rama `a014577`). Este archivo no implementa ni valida esa PR.
- La integración visual completa de Graphite (Inicio/Movimientos/componentes) sigue siendo
  trabajo futuro; este archivo no la declara hecha.

## Límites

- Los prototipos son estáticos y no forman parte de la aplicación.
- Las capturas y datos son sintéticos; no hay información financiera real.
- La documentación y las capturas reflejan la fase de diseño; los datos de la aplicación y
  los motores financieros conservan su propia autoridad.
- Los informes QA describen las capturas 2× originales; la evidencia versionada es 1×. Los
  scripts `make-*.py`, `shot-*.mjs` y `qa-*.mjs` documentan el flujo original y no regeneran
  la evidencia 1× desde Git; los originales 2× están en la release.
- El archivo no sustituye los tokens de producción ni autoriza despliegues, merges o datos
  reales.

## Verificación

Desde este directorio:

```bash
shasum -a 256 -c MANIFEST.sha256
```

Para verificar la release publicada:

```bash
gh release download graphite-lime-design-2026-11-10
shasum -a 256 -c graphite-lime-phase-c-raw-2026-11-10.tar.gz.sha256
mkdir -p /tmp/graphite-raw
tar -xzf graphite-lime-phase-c-raw-2026-11-10.tar.gz -C /tmp/graphite-raw
cd /tmp/graphite-raw
shasum -a 256 -c /ruta/al/RAW-MANIFEST.sha256
```

Para comprobar los originales 2×, mientras exista el árbol de artefactos:

```bash
cd artifacts/ui-premium/phase-c
shasum -a 256 -c ../../../specs/investigations/graphite-lime-design-2026-11-10/RAW-MANIFEST.sha256
```

El `MANIFEST.sha256` incluye todos los archivos del archivo documental excepto él mismo. El
`RAW-MANIFEST.sha256` incluye los 137 originales (7 activos compartidos, 124 archivos de
`candidates/` y 6 referencias de comparación).
