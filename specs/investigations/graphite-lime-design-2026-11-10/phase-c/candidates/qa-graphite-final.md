# QA · Graphite Lime · cierre

Matriz de accesibilidad y legibilidad sobre Inicio (referencia), Movimientos, Estados y
Formularios. No es una auditoría WCAG completa.

## Resultados

| Vista | Overflow | Errores | Texto < 12 | Contraste | Táctil < 44 |
| --- | --- | --- | --- | --- | --- |
| Movimientos 1440 | 0 | 0 | 0 | 0 fallos | n/a |
| Movimientos 390 | 0 | 0 | 0 | 0 fallos | 0 |
| Estados 1440 | 0 | 0 | 0 | 0 fallos | n/a |
| Estados 390 | 0 | 0 | 0 | 0 fallos | 0 |
| Formularios 1440 | 0 | 0 | 0 | 0 fallos | n/a |
| Formularios 390 | 0 | 0 | 0 | 0 fallos | 0 |
| Formularios EUR 1440 | 0 | 0 | 0 | 0 fallos | n/a |

Mínimos:

- Movimientos/Estados: **5,16:1**.
- Formularios: **5,76:1** (`form-info`).
- Focus ring: **3 px sólido `#D7FF5E`**.
- Zoom equivalente 200 %: **720/640 px sin overflow de página**.
- Movimiento reducido: transiciones a **0,01 ms**.
- Controles táctiles a 390: **0 por debajo de 44 px**.

## Foco y teclado

- 18/18 elementos del primer recorrido de Movimientos y Formularios tienen outline visible.
- La fila de Movimientos enfocada muestra anillo lima de 3 px, sin quedar recortada por la
  tarjeta.
- Secuencia del formulario de Compra: fecha → instrumento → saldo efectivo → saldo inversión →
  cantidad → precio → divisa → cambio → importe EUR → comisión → concepto → nota → cancelar.
- Con EUR seleccionado, el foco pasa de Divisa directamente a Importe EUR cargado; el cambio
  queda oculto, desactivado y fuera del orden de tabulación.
- El control nativo de fecha conserva sus segmentos internos; el campo completo mantiene
  outline visible.
- Menú móvil: abre con foco dentro, cierra con Escape y devuelve el foco al botón.

## Zoom 200 %

Se ha simulado el reflow equivalente a 1440→720 y 1280→640 px CSS:

| Página | 720 | 640 |
| --- | --- | --- |
| Movimientos | Sin overflow | Sin overflow |
| Formularios | Sin overflow | Sin overflow |

La tabla conserva su región de scroll interno; no hay scroll horizontal de página. No sustituye
una prueba manual de zoom del navegador.

## Movimiento reducido

Con `prefers-reduced-motion: reduce`, nav, botones, filas y filtros presentan
`transition-duration: 0.00001s` y `animation-duration: 0.00001s`. El prototipo base ya aplica
la regla global; la implementación de producción debe conservarla/extenderla.

## Formularios

- Compra USD: cambio visible, obligatorio y con valor `0,900000`.
- Compra EUR: cambio oculto, desactivado, `required=false`, estado “EUR · cambio no requerido”.
- Amortización: campos del modelo, Deuda derivada, capital/intereses de solo lectura y aviso
  semántico de “no genera Gasto”.
- 9 campos de formulario completo en Estados; formularios de Compra/Amortización con 12 y 10
  campos/controles respectivamente.
- Fechas nativas; la captura se ha generado con locale español para mostrar `dd/mm/aaaa`.

## Límites

- No hay prueba con lector de pantalla ni zoom manual real al 200 %.
- No se ha auditado cada píxel ni cada combinación de opacidad/gradiente.
- Solo se han probado datos sintéticos.
- No se ha modificado la aplicación ni los tokens de producción.

## Evidencia

- `qa-graphite-final.json`
- `qa-keyboard-form.json`
- `shots-graphite-a11y/movimientos-row-focus.jpg`
- `shots-graphite-a11y/formularios-focus.jpg`
- `shots-formularios/`
- `comparativa-formularios-graphite.jpg`
