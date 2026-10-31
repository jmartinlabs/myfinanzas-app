# 33 — D′ simplificada: progreso de implementación

Status: candidato técnico local. Sin migración real, activación, merge ni
despliegue. Depende de la rama `codex/comida-unico-01` (PR #136) por el
proveedor central de devoluciones y el esquema v19.

## Autorización y preflight

- Encargo humano del 2026-10-31: desarrollo de SPEC33 dentro de revisión 2 y
  enmiendas E1/E2 aprobadas, con QA independiente y PR separada.
- Base: `codex/comida-unico-01` `dcc3de4`; `main` documental `98b9792`.
- Rama: `codex/dprima-simplificada`; esquema v20.
- Sin datos reales, Excel, migración de filas ni activación del nuevo modelo.

## Alcance implementado

- **Partidas como maestro planificable:** `padre_partida` opcional (raíz/hija,
  dos niveles) y `fuente` (`Gasto real`, `Aportación a saldo`, `No aplica`),
  separados de Categoría/Subcategoría y del `presupuesto` legado. Triggers
  impiden bucles, padres no raíz y reparentar una Partida usada; una raíz con
  hijas rechaza Gastos nuevos sin tocar el histórico.
- **Gastos Previstos:** cabecera por raíz con rango inclusivo de meses
  financiados, saldo exclusivo y saldo inicial confirmado con evidencia; líneas
  por hija con importe/fecha opcionales y Esencial; copia inicial revisable de
  hijas activas; sin solapes por raíz; anulación lógica de líneas, sin DELETE.
- **Plan Mensual por raíz:** Base/Esencial/Del mes manuales, fuente aplicada,
  destino por ciclo y ejecución atribuida por Partida. Gasto real y Aportación a
  saldo son magnitudes distintas; un destino compartido bloquea la atribución
  automática.
- **Apertura E1/E2:** T completo exige importe en todas las líneas incluidas;
  si falta, subtotal Parcial y T/P/sugerida null con líneas pendientes. La
  exclusión manual explícita permite recalcular T. P/N solo propone cuota para
  raíces con fuente Aportación a saldo. Redondeo al céntimo, mitad hacia arriba,
  N positivo y saldo negativo firmado. Confirmar no crea Movimiento ni ejecuta
  transferencia.
- **G neto:** bruto de compras de la planificación menos devoluciones
  acreditadas del proveedor central de Comida; sin origen acreditado, G parcial
  y sin sugerencia completa.
- **Mapping:** propuesta de diagnóstico uno-a-uno, Presupuesto con varias
  Partidas, Presupuesto sin Partida y Partida sin planificación; nunca reparte
  objetivos, crea hijas ni convierte líneas anuales. La confirmación es explícita.
- **Legado:** Presupuestos y Plan Anual se conservan consultables; no se
  renombran, migran ni reinterpretan.

## Evidencia local (macOS, Bun 1.4.3)

- `NODE_ENV=test bun test apps/api/src/dprima.test.ts`: 23 PASS / 0 FAIL.
- `bun run typecheck`: PASS.
- `bun run build`: PASS.
- Suite API completa con `TMPDIR` seguro: los mismos fallos de entorno que
  `main` (backup/age, señales/WAL y `libc.so.6`). No se declaran PASS.
- Contrato v20 generado y verificado; upgrade v19→v20 UNRUN como prueba
  dedicada, v18→v20 cubierto por la suite existente ajustada.

## Pendientes y límites

- UI 390/1440, teclado y E2E: implementada de forma básica, sin Playwright.
- Finalización funcional, fotos y rectificación de periodos cerrados: dependen
  del proveedor de cierre SPEC27, no instalado.
- Mapping físico vigente, preservación de Esencial/Deuda/Referencia y migración
  real: requieren autorización específica y contraste de la base; no ejecutados.
- Correlación automática de Transferencias entre raíces: bloqueada si el destino
  no es inequívoco.
- CI Linux, restore v20, QA independiente: pendientes.

### Correcciones tras QA independiente

La QA devolvió FAIL por AC-11, P/N en Gasto real, G con devoluciones fuera de
ventana, fuente aplicada, neto mensual, cambio de fuente/destino y omisiones del
mensual. Corregido en el candidato: guard de desactivación de hijas usadas,
P/N solo Aportación, G acotado a compras de la ventana, fuente aplicada en
apertura, mensual íntegro con devoluciones visibles, todas las raíces en el
mensual, bloqueo de destinos reservados por previsiones, apertura con destino
exclusivo, duplicados/solapes 409, rectificación a raíz agrupada rechazada,
exclusiones con motivo y mapping sin duplicados. Suite focal: 20 PASS.
Segunda ronda QA focal: A1–A6, M1–M3, M5–M7 y B1/B3–B6 acreditados. Se
corrigieron además M4, el solape 409, la apertura no-Aportación (`restantes`
nullable), la limpieza de intentos en restore y el snapshot de Partidas. CI
Linux y una última pasada de QA: pendientes.
