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
| AC-08 | Cambio de destino/tránsito | Destino compartido bloquea; tránsito no implementado | PARCIAL |
| AC-09 | Ajuste manual de sugerida y gasto nuevo | Importe manual persistido | PARCIAL: no se prueba que un gasto posterior no lo sobrescriba |
| AC-10 | Reintento de apertura | Una sola apertura e importe | PASS |
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
| AC-22 | Corte previo sin foto, primer ciclo, pago externo y tránsito | Apertura sin cierre previo; G inicial 0; tránsito no implementado | PARCIAL |
| AC-23 | P100/N3 y S−50 | 33,33 y 850/425 con saldo firmado | PASS (283,33 con N3 y S−50) |
| AC-24 | Reembolso actual/anterior/sin origen y hecho tardío | Neto solo con elegibilidad; no reescribe cerrado | PARCIAL (cierre UNRUN) |
| AC-25/E1 | IBI100/Seguro sin importe; exclusión | Subtotal100, T/P/sugerida null; tras excluir T100/P0/0 | PASS |
| AC-26/E2 | Gasto real manual y Aportación T200/G80/S20/N2 | Sin cuota para Gasto real; Aportación sugiere; hechos no se crean | PARCIAL: ejecución 25 pendiente |

## Límites de evidencia

- No se acredita migración real, activación, fotos cerradas ni conciliación.
- El mapping probado es diagnóstico y una confirmación explícita; no se ejecutó
  sobre datos reales.
- La UI no tiene E2E ni capturas verificadas.
