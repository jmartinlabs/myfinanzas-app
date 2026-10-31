# 33 — D′ simplificada: testplan

Status: cobertura creada para el candidato v20. Los estados PASS se refieren solo
a pruebas reales ejecutadas. `UNRUN` no acredita comportamiento.

Comando focal: `NODE_ENV=test bun test apps/api/src/dprima.test.ts`.
Entorno local: macOS, Bun 1.4.3, SQLite `bun:sqlite`, fixtures ficticias.
Canónica/CI: `python3 scripts/verify --full` (Python 3.10+) y CI Linux.

| AC | Caso | Evidencia | Estado |
| --- | --- | --- | --- |
| AC-01 | Raíz simple y raíz con dos hijas | `listDprimaPartidas` + jerarquía independiente | PASS |
| AC-02 | Gasto real por Partida y aportación por Transferencia | Atribución mensual por Partida | PARCIAL: aportación por Transferencia no montada |
| AC-03 | Copia de hijas y alta posterior | Copia revisable; catálogo posterior no altera líneas | PASS |
| AC-04 | Dos líneas 100 de la misma hija y compra 80 | T=200, ejecutado global 80 | PASS (creación de segunda línea) |
| AC-05 | T1000/G200/S300/N2 | P500; sugerida250 (N2, céntimos) | PASS |
| AC-06 | Dos planes con el mismo saldo 1000 | S null y sugerida null, sin cero falso | PASS |
| AC-07 | Rango ene–mar y apertura feb | N incluye el ciclo que se abre | UNRUN (ejemplo concreto no montado) |
| AC-08 | Cambio de destino/tránsito | Destino compartido y previsión bloquean; cambio libre rechazado; tránsito no implementado | PARCIAL |
| AC-09 | Ajuste manual de sugerida y gasto nuevo | Importe manual persistido | PARCIAL: no se prueba que un gasto posterior no lo sobrescriba |
| AC-10 | Reintento de apertura | Una sola apertura; segunda clave y solape ⇒ 409 | PASS |
| AC-11 | Reparentar/desactivar hija usada | Trigger/servicio rechaza íntegro | PASS |
| AC-12 | Cambio de maestro tras foto cerrada | Depende del proveedor de cierre | UNRUN |
| AC-13 | Finalizar último ciclo y nueva planificación | Cierre funcional no implementado | UNRUN |
| AC-14 | Sustituir Plan Anual con mapping | Histórico conservado; sin reparto/fechas inventadas | PASS (diagnóstico) |
| AC-15 | Devolución acreditada de compra del plan | G neto con bruto/devoluciones separados | PARCIAL: caso G80/P800 no montado |
| AC-16 | Cuenta/corte/Partida incompletos, N0 | Motivo y Parcial/No disponible; sin división | PASS (E1/S) |
| AC-17 | Mapping PRE agrupado y Deuda/Referencia | IDs/relaciones preservados; sin duplicar objetivo | PASS (diagnóstico) |
| AC-18 | UI 1440/390, teclado, 401/404/409/422 | UI básica; sin Playwright | UNRUN |
| AC-19 | Reabrir/restore futuro esquema | Sin prueba de restore v20 | UNRUN |
| AC-20 | Diff documental sin tocar Comida | Esta entrega no modifica Comida salvo dependencia | PASS (revisión de diff) |
| AC-21 | Raíz con hijas e histórico | Gasto nuevo en padre rechazado; histórico intacto | PASS |
| AC-22 | Corte previo sin foto, primer ciclo, pago externo y tránsito | Apertura sin cierre previo; G inicial 0; pago Terminal incluido; tránsito no implementado | PARCIAL |
| AC-23 | P100/N3 y S−50 | 33,33 y 850/425 con saldo firmado | PASS (283,33 con N3 y S−50) |
| AC-24 | Reembolso actual/anterior/sin origen y hecho tardío | Neto solo con elegibilidad; no reescribe cerrado | PARCIAL (cierre UNRUN) |
| AC-25/E1 | IBI100/Seguro sin importe; exclusión | Subtotal100, T/P/sugerida null; tras excluir T100/P0/0 | PASS |
| AC-26/E2 | Gasto real manual y Aportación T200/G80/S20/N2 | Sin P/N para Gasto real; Aportación sugiere; hechos no se crean | PARCIAL: ejecución 25 no montada en suite |

## Límites de evidencia

- No se acredita migración real, activación, fotos cerradas ni conciliación.
- El mapping probado es diagnóstico y una confirmación explícita; no se ejecutó
  sobre datos reales.
- La UI no tiene E2E ni capturas verificadas.

## Correcciones tras QA independiente (2026-10-31)

| Hallazgo | Corrección | Evidencia |
| --- | --- | --- |
| A1/AC-11 | Guard de desactivación de hija/raíz usada y trigger v20 | Test A1 |
| A2/E2 | P y N null para fuente distinta de Aportación | Test A2 |
| A3 | G ignora devoluciones de compras fuera de la ventana | Test A3 |
| A4 | La fuente aplicada en el ciclo manda en apertura | Test A4 |
| A5 | Mensual Gasto real conserva importe íntegro y muestra devoluciones | Test A5 |
| A6 | Cambio de fuente/destino mensual exige impacto (se rechaza) | Test A6 |
| M1 | El mensual incluye todas las raíces | Test M1/M2 |
| M2 | Previsión sobre Saldo compartido bloquea atribución | Test M1/M2 |
| M3 | G incluye Gastos pagados desde Terminal | Revisión de código + tests |
| M4 | Primera hija de raíz con histórico exige revisión | Test M4: bloqueo y rechazo |
| M5 | Apertura coherente con el destino exclusivo | Test M5 |
| M6 | Apertura duplicada y solape ⇒ 409 | Tests M6 y duplicado |
| M7 | Rectificación a raíz con hijas rechazada por trigger | Test M7 |
| B1 | Exclusión con motivo del usuario y sin duplicados | Código |
| B3 | Importe de apertura no aplicable a Gasto real ⇒ 422 | Código |
| B4–B5 | UI no ofrece confirmación sin Partida; estado de tag corregido | UI |
| B6 | Huella con bruto/devoluciones/ventana/saldo/P | Código |
| B7 | Tabla de intentos propia para configuración de Partida | Esquema v20 |

## Segunda ronda QA — correcciones 2026-10-31

- M4 implementado con guard y prueba: añadir hija a raíz con Gastos históricos
  queda bloqueado con motivo de revisión de impacto.
- Solapes de planificación se traducen a 409; errores SQL no relacionados
  siguen siendo 500 genéricos sin filtrar detalles.
- Confirmar apertura de fuente no-Aportación ya no rompe por `restantes`:
  la columna admite null y la respuesta devuelve null (E2).
- Restore limpia `dprima_partida_attempts`.
- Snapshot de `partidas` en pruebas de continuidad incluye las columnas v20.
- Suite focal: 23 PASS; suite API sin fallos propios frente a main.

## E2E 2026-10-31 — D′ · Partidas y previsión

Entorno: Playwright Chromium local, servidor de fixture ficticio en 3021, MFA real.
Comando: `bunx playwright test tests/e2e/comida-dprima.spec.ts --reporter=line`.

| Comprobación | 1440 | 390 |
| --- | --- | --- |
| Navegación y Maestro de Partidas | PASS | PASS |
| Previsión: edición de línea y persistencia | PASS | — |
| Apertura: T/S/sugerida y confirmación | PASS | — |
| Confirmar apertura no crea Movimientos (conteo antes/después) | PASS | — |
| Mensual: Gasto vs Aportación separados, guardado y recarga | PASS | — |
| 409 real de rango solapado por API | PASS | — |
| Mapping diagnóstico y acción de confirmación | PASS | — |
| Región desplazable y overflow | PASS | PASS (ficha en región accesible; página sin overflow) |

Ambas resoluciones abren la pantalla; a 390 se abre además la ficha de
planificación dentro de una región desplazable accesible. No se activa ningún
régimen real ni se usan datos reales.

## Responsive 390 — corrección 2026-10-31

`TableScroll` envuelve las tablas de Maestro, planificaciones, mensual y líneas
previstas. La ficha D′ a 390 mantiene la página en 390 y desplaza la tabla
internamente; foco y etiqueta accesibles; a 1440 sin scroll interno.
