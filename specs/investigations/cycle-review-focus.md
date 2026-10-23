# Foco en revisión de Ciclos — diagnóstico acotado

2026-10-23. Usuario autoriza revisión técnica acotada del fallo E2E de PR #50,
reproducción limitada y propuesta mínima en PR independiente. No autoriza aplicar
el cambio de producto ni hacer merge. PR #50 permanece exclusivamente documental;
Dev32, infraestructura AC22, B4, E2.3, despliegues, issue #22 de Agentic Template y
archivos ajenos de backlog quedan fuera del trabajo.

## Evidencia de origen

- Main integrado: `1cdbc7c8ce843bebe15117e1e6dc179f92e0e545`.
- PR #50, HEAD `377e48d07d660f7777d01de8b6a821d111b52dd4`, solo cambia documentación;
  producto/tests idénticos a main. No se ha modificado esa rama durante esta revisión.
- [Run PR 39982407597](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39982407597),
  job 120512797316: API 125 PASS/0 FAIL; E2E 1 PASS/1 FAIL. Falla
  `tests/e2e/cycle-operations.ts:151`: `toBeFocused()`, expected focused / received
  inactive, timeout original 5000 ms. El test ya espera región visible y hechos presentes;
  no realiza otra acción de usuario antes de verificar el foco.
- [Push del mismo SHA](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39982345578)
  y [main posterior al merge](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39980584663)
  SUCCESS. El fallo no reaparece en AC23/API y no se atribuye a SQLite.

## Hipótesis y resultado

En [CycleOperationForm](../../apps/web/src/Ciclos.tsx), `review()` llama a
`setImpact(await api(...))` y programa `requestAnimationFrame(() => reviewRef.current?.focus())`.
El nodo con `reviewRef` se monta condicionalmente al confirmar React el nuevo `impact`.
RAF no está vinculado a ese commit: si se ejecuta primero, la ref es null y el optional
chaining descarta el foco. No se vuelve a intentar cuando aparece la región.

**Defecto real de gestión del foco reproducido**, no solo una aserción demasiado temprana:
en la intercalación controlada la región ya está visible y sigue sin foco al agotar los
5000ms originales. El test detecta correctamente esa pérdida. El control no demuestra
que el render/foco falle en todos los órdenes, ni una frecuencia de fallo.

El log original de CI no registra callbacks/commits. La carrera reproducida es compatible
con su síntoma, pero no demuestra el orden interno exacto de aquel run. No se afirma
que se hayan descartado todas las causas posibles de pérdida de foco del shell completo.

## Prueba limitada y comparación temporal

Herramienta: [probe independiente](../../scripts/diagnostics/cycle-review-focus.ts).
Usa Bun 1.4.3, React 19.3.1/ReactDOM del lockfile y Chrome 155.0.8059.85 headless en macOS.
Compila el componente real en memoria, lo exporta para el harness y registra el callback
exacto sin cambiar su orden. La variante de comparación introduce el hook solo en ese
bundle temporal. La etiqueta sourceVariant de los JSON identifica la fuente base;
el campo variant distingue explícitamente la modificación temporal. Sirve loopback
en puerto efímero, con una respuesta preview ficticia interceptada. No usa bases,
credenciales, backend productivo ni datos personales.

Se retiene un mensaje del scheduler React mediante un wrapper de MessageChannel,
dejando RAF y focus nativos. Así se fuerza que el callback ocurra antes del commit.
Después de observar dos frames se libera el trabajo retenido. No se cambia la aserción
de foco ni su timeout. La observación de DOM por MutationObserver ocurre tras la
mutación; no es un timestamp exacto del commit de React.

| Fase/caso | Resultado real |
| --- | --- |
| Control inicial, componente original y scheduler normal | Región visible y foco PASS |
| Componente original, scheduler retenido | Región visible; `toBeFocused()` FAIL esperado, sin llamada a focus |
| Candidato temporal useLayoutEffect, misma retención | Región visible y foco PASS |
| Segunda pareja, registro del callback exacto original | `review-focus-frame`: `region=false`, `refPresent=false`; tras liberar, región visible y foco FAIL esperado |
| Segunda pareja, candidato temporal con el mismo registro | `focus-call`: región presente; región observada con foco PASS |

Cinco casos en total: una pasada de tres controles y una última pareja para atribuir
el callback exacto; no más repeticiones ni suite E2E íntegra relanzada.
[Registro inicial](cycle-review-focus-control.json) y [traza exacta](cycle-review-focus-trace.json)
contienen solo resultados/etiquetas DOM ficticias. Una salida 0 del probe significa que
se observaron los resultados esperados, incluido FAIL negativo del componente original;
no significa que el producto original haya pasado la comprobación de foco.

Reproducción desde un checkout con dependencias del lockfile ya instaladas:

```sh
bun scripts/diagnostics/cycle-review-focus.ts . "$CHROME_EXECUTABLE" .local/focus-result.json
# Solo la pareja de traza, para no repetir el control normal:
bun scripts/diagnostics/cycle-review-focus.ts . "$CHROME_EXECUTABLE" .local/focus-trace.json --controlled-only
```

`CHROME_EXECUTABLE` apunta a un Chrome/Chromium local compatible. El probe falla si
desaparece el patrón original de review, cambia el resultado esperado o hay un error
del navegador; no incluye reintentos de CI ni cambios de timeouts.

SHA256 de las fuentes observadas (iguales en main y PR #50):

- `apps/web/src/Ciclos.tsx`: `6d06daac4cdf510415a08db08aca7697cd65916bad4d0fb3058c5c01503088cf`.
- `tests/e2e/cycle-operations.ts`: `0c50f29d9c34c2f6b40a8e46e0d483e1740959ece569f1d5614641eab6510763`.

## Corrección mínima propuesta, NO aplicada al producto

Conservar el estado/API, la región y su `tabIndex=-1`. Importar `useLayoutEffect`,
retirar solo el RAF de foco exitoso en `review()` y enfocar al confirmar React cada
nuevo `impact`, incluidas revisiones/páginas posteriores:

```tsx
useLayoutEffect(() => {
  if (impact) reviewRef.current?.focus();
}, [impact]);
```

Esta modificación existe únicamente en el bundle temporal de comparación del probe.
No se han editado archivos de apps, tests, timeouts, lockfile ni PR #50. El scope
no incluye otros callbacks de error/foco del producto ni una auditoría general.

React asigna las refs en commit y ejecuta useLayoutEffect después de colocar el DOM,
antes de pintar: [refs/commit](https://react.dev/learn/manipulating-the-dom-with-refs#when-react-attaches-the-refs),
[useLayoutEffect](https://react.dev/reference/react/useLayoutEffect).
RAF solo garantiza una llamada antes de un repintado, no un commit de React:
[MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).

## Plan y decisión pendiente

1. Autorizar la corrección mínima en la PR independiente de este diagnóstico.
2. Aplicar el hook al componente; mantener `toBeFocused()` y 5000 ms del E2E existente.
   Añadir regresión enfocada del orden RAF/commit, sin instrumentación de scheduler
   en el producto ni nuevos endpoints/dependencias. Comprobar revisión inicial,
   nueva página/revisión y regreso al borrador sin robar foco tras limpiar impact.
3. Verificar typecheck/build, comparación enfocada y una pasada E2E normal/CI Linux;
   detenerse ante un fallo nuevo, sin timeouts aumentados ni relanzamientos indefinidos.
4. Revisar el candidato y solicitar aprobación de merge por el número de su PR.

Esta PR presenta diagnóstico, herramienta y plan; no entrega aún la corrección de
accesibilidad. PR #50 conserva su fallo observado: no se reejecuta para ocultarlo.

## Comprobaciones del diagnóstico publicado

Probe ejecutado con resultados negativos/positivos esperados, sin relanzar la suite
E2E completa. Su copia publicada es idéntica al script de la última pareja por SHA256
`a1143c6737012f2425b3d5cd0145a95fdf88a582aa086e2f4abd8ac43d999b4e`.
validate-template, 18 regresiones del validador, check-project, check-repository y
diff --check PASS. No se atribuye a estos controles una validación de la corrección
de producto, que sigue propuesta y necesita autorización y pruebas de su candidato.
