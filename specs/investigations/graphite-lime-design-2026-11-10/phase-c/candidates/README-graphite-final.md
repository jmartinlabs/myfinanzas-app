# Graphite Lime · cierre de validación

**Estado:** dirección visual **aprobada como candidata prioritaria para integración futura**.
No hay implementación en la aplicación, ni cambios en tokens de producción, API, SQLite, Excel
o ramas `test`/`main`.

**Fecha de la validación:** 2026-11-10.
**Base de prototipado:** Inicio, Movimientos, móvil, tablet, estados y formularios aislados.

## Qué se ha comprobado

| Comprobación | Resultado |
| --- | --- |
| Tipografía funcional en escritorio | **0 textos < 12 px** |
| Tipografía funcional en móvil | **0 textos < 12 px** |
| Contraste AA en superficies Graphite | **0 fallos**; mínimo **5,16:1** |
| Contraste AA en formularios | **0 fallos**; mínimo **5,76:1** |
| Foco visible por teclado | **3 px sólido lima** en navegación, tabla y formularios |
| Navegación por teclado | Orden de foco correcto; fecha nativa con segmentos; sin trampas |
| Menú móvil por teclado | Abre, enfoca dentro, cierra con Escape y devuelve el foco |
| Zoom equivalente al 200 % | 720 y 640 px CSS: **sin overflow de página** |
| `prefers-reduced-motion` | Transiciones a **0,01 ms** en nav, botones, tabla y filtros |
| Objetivos táctiles a 390 | **0 controles visibles < 44 px** |
| Overflow horizontal | **0** en Movimientos, Estados y Formularios a 1440/390; barrido 1024/820/768 |
| Errores de consola | **0** |

La prueba de zoom se ha hecho con el ancho CSS equivalente a un 200 % (720 px desde 1440 y
640 px desde 1280); no sustituye una auditoría manual en navegador con zoom real, pero cubre
el reflow y la ausencia de scroll horizontal de página.

## Semántica de color

Graphite separa identidad y estados financieros. Esta es la regla que debe conservarse en la
futura implementación:

| Rol | Token / valor | Uso | No usar para |
| --- | --- | --- | --- |
| Marca / acción / información | `--accent` / `--action` · `#D7FF5E` | Botones primarios, navegación activa, foco, selección, badges informativos | Ingresos, resultados positivos, “Completo/Guardado” |
| Positivo / correcto | `--positive` / `--ok` · `#7FE0A8` | Ingresos, devoluciones, “Completo”, “Guardado” | Marca, acciones, selección |
| Negativo | `--negative` · `#FF9A8C` | Gastos, importes negativos | Marca |
| Advertencia / parcial | `--warning` · `#FFD166` | Parcial, pendiente, avisos | Estados correctos |
| Error | `--error` · `#FF8178` | Errores de carga/validación | Avisos menores |
| Neutro / anulado | `--muted` · `#8F988B` | “Vigente” como estado neutro, anulados, no disponible | Éxito o marca |

El detalle de Movimientos usa un badge neutro para “Vigente”; el lima queda en la selección y
en la acción. En formularios, el aviso de “no genera Gasto” usa ámbar, no lima.

## Formularios comprobados

### Compra de inversión

Página: [`formularios-graphite.html`](formularios-graphite.html).

Campos visibles y conservados del modelo vigente (SPEC19 / `Inversiones.tsx`):

- Fecha, Instrumento, Saldo de efectivo, Saldo de inversión.
- Cantidad, Precio unitario, Divisa, Cambio histórico, Importe EUR cargado.
- Comisión EUR incluida.
- Referencia informativa cantidad × precio × cambio y diferencia.
- Concepto y Nota.

Reglas visuales:

- La Compra **no es un Movimiento**; se identifica como registro de inversión.
- El Saldo de efectivo se muestra con su cifra y sin agregado.
- **Cambio histórico es condicional:** visible y obligatorio con USD; oculto, desactivado y
  explicado como “EUR = 1” al seleccionar EUR. El foco salta a “Importe EUR cargado”.
- La comisión se presenta como incluida; no se resta otra vez.
- Sin Partida, Referencia, Ciclo ni Deuda.

Evidencia: [USD, cambio visible](shots-formularios/graphite-lime-1440.jpg) ·
[EUR, cambio oculto](shots-formularios/graphite-lime-1440-eur.jpg) ·
[móvil](shots-formularios/graphite-lime-390.jpg) ·
[tablero comparativo](comparativa-formularios-graphite.jpg).

### Amortización de deuda

Campos visibles y conservados del modelo vigente (SPEC06 / `Movimientos.tsx`):

- Tipo “Amortización deuda” (sin Subtipo).
- Fecha, Importe, Concepto.
- Saldo origen y Destino fijo Exterior S000.
- Partida, Subcategoría/Categoría derivadas, Deuda derivada, Referencia.
- Nota.
- Derivados: Capital = importe, Intereses = 0, sin Gasto.
- Impacto informativo: banco, principal y gasto.

Reglas visuales:

- Es un **Movimiento**; no genera Gasto, plan ejecutado ni una Transferencia.
- La Deuda se deriva de la Partida; no hay un segundo selector.
- La Referencia se presenta como condicionada por la categoría, sin inventar obligación.
- Los campos derivados son de solo lectura.

Evidencia: incluida en el tablero de formularios y en las capturas completas.

## Evidencia de QA

- [`qa-graphite-final.md`](qa-graphite-final.md) — resumen.
- [`qa-graphite-final.json`](qa-graphite-final.json) — datos de contraste, fuentes, zoom,
  movimiento reducido, foco e interacciones.
- [`qa-keyboard-form.json`](qa-keyboard-form.json) — secuencia de foco y salto del campo
  condicional.
- [`qa-movimientos.json`](qa-movimientos.json) — matriz de Movimientos/Estados de los tres
  candidatos.
- `shots-graphite-a11y/` — foco visible en fila de tabla y campo de formulario.

## Recomendación

Graphite Lime queda como **primera implementación visual** cuando el producto alcance la
estabilidad necesaria. Color Finance y Pastel Editorial se conservan como candidatos, sin más
refinamiento por ahora.

No se implementa nada en esta entrega. El paquete de consolidación y el plan incremental están
en [`README-integracion.md`](README-integracion.md).

## Límites

- No es una auditoría WCAG completa: no hay lector de pantalla, zoom manual del navegador,
  pruebas con usuarios ni revisión píxel a píxel.
- Datos exclusivamente sintéticos; no se ha usado información real.
- Los formularios son demostrativos y no ejecutan lógica financiera.
- No se han modificado la aplicación, los motores, la API, SQLite, el Excel, los tokens de
  producción ni las ramas `test`/`main`.
- No hay commit, push, merge ni despliegue. El checkout está limpio.
