# 20 — E4.5 Histórico precontrol y transición de ejercicio: Test plan

Specification: [20-historico-precontrol-specification.md](20-historico-precontrol-specification.md)

Status: **DISEÑO DOCUMENTAL — NO EJECUTADO.** Esta fase solo prepara especificación,
wireframes y testplan con datos ficticios. No hay implementación, código, SQL, migración,
importador, Excel, datos reales, PR ni merge. Todos los AC funcionales están `UNRUN`.
La QA documental independiente se registra en el [progress](20-historico-precontrol-progress.md)
y no convierte un diseño de prueba en PASS funcional.

Base: `origin/main` `1d539a8cb9c38b3a8d2e3921a3651197105ce282` (2026-10-27).
Los comandos de implementación se proponen para el futuro desarrollo autorizado; no se
ejecutan aquí. Cualquier fixture con importes es ficticio.

## Matriz de aceptación

| Acceptance ID | Clase/condición | Precondiciones y acción | Resultado esperado | Método/comando propuesto | Entorno/owner | Evidencia esperada | Resultado actual |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-01 | C (E4.11) | Fixture cross-contract con `tipoRegistro=Archivo` de E4.5 y `tipoRegistro=Foto` de E4.11; consultar contratos | Discriminantes `Archivo`/`Foto`; ninguno se etiqueta como otro; la foto no se recalcula desde archivo | Bun Test de contrato E4.11; no UI E4.5 | Documental ahora; contrato futuro | DTO cross-contract | UNRUN — diseño |
| AC-02 | I | Registro con `idOrigen`, huella y procedencia; recargar y restaurar copia ficticia | `idArchivo` estable/único/inmutable; origen y huella conservados; sin reutilización | Bun Test + restore aislado E4.12 | Documental ahora; API/restore futuro | Snapshot lógico y DTO | UNRUN — diseño |
| AC-03 | I | PAR100/REF100 renombrados; consultar archivo | Mismo ID/enlace; nombre vigente; nombre original en procedencia; total igual | Bun Test de mapping + Playwright | Documental ahora; API/UI futuro | DTO con `nombreOrigen`/`destinoId` | UNRUN — diseño |
| AC-04 | I | Fila con solo nombre y dos Partidas homónimas | `Ambigua`/`Pendiente`, sin asignación; «Sin clasificar»; total global `NoVerificable` | Bun Test de mapping + API | Documental ahora; API futuro | Registro y motivo | UNRUN — diseño |
| AC-05 | I | Archivo 01/01–27/08 1.200,00 + detalle 28/08–31/12 300,00; control 28/08; corte 31/12 con reloj posterior | Total 1.500,00 una vez; componentes 1.200/300; cobertura completa | Bun Test del combinador | Documental ahora; API futuro | DTO exacto con strings | UNRUN — diseño |
| AC-06 | I | Archivo 01/01–27/08 1.200,00; control desde 27/08; detalle 27/08–31/12 320,00 (20,00 el 27/08 + 300,00 después); DTO F2 separado | Solapamiento 27/08; total `null`; archivo 1.200 + detalle 320 visibles; subtotal 1.500; 20,00 en `conflictos[]` fuera del subtotal; `estadoCobertura=Solapada`, `estadoTotal=NoVerificable`; no 1.520 total | Bun Test de frontera inclusiva | Documental ahora; API futuro | DTO con `Solapamiento` y componentes | UNRUN — diseño |
| AC-07 | I | Archivo hasta 30/06; detalle desde 01/08 | Hueco 01/07–31/07; cobertura `Parcial`; total `null`; subtotal; no 0 | Bun Test de unión de intervalos | Documental ahora; API futuro | Intervalos/huecos exactos | UNRUN — diseño |
| AC-08 | I | Cortes 27/08 y 28/08 sobre archivo/detalle contiguos | 27/08 solo archivo y cobertura hasta 27/08; 28/08 incorpora detalle una vez | Bun Test de corte inclusivo | Documental ahora; API futuro | Dos DTO comparables | UNRUN — diseño |
| AC-09 | I | Cobertura completa 01/01–31/12 con fuente/intervalo verificado y sin filas | Total 0,00 verificado; «sin hechos en intervalo cubierto»; no «No disponible» | Bun Test de cobertura vacía | Documental ahora; API futuro | DTO con `"0.00"` y estado | UNRUN — diseño |
| AC-10 | I | Sin archivo y control desde 01/09; consulta anual | Total `null`; motivo de cobertura anterior; no 0 | Bun Test | Documental ahora; API futuro | DTO con `motivo` | UNRUN — diseño |
| AC-11 | I | Registro 0,00 verificado vs ausencia en cobertura completa | 0 informado y ausencia se distinguen; ambos suman 0 sin confundirse | Bun Test + UI | Documental ahora; API/UI futuro | DTO y captura | UNRUN — diseño |
| AC-12 | I | Dos filas idénticas de misma fuente/identidad/huella | Un registro; total una vez; aviso de duplicado | Bun Test de deduplicación | Documental ahora; API futuro | Conteo y DTO | UNRUN — diseño |
| AC-13 | I | Dos fuentes distintas con mismo intervalo/Partida, aunque el importe difiera | Dos candidatos ambiguos; no suma ni elige por importe; total no verificable | Bun Test + UI | Documental ahora; API/UI futuro | DTO con `Ambigua` | UNRUN — diseño |
| AC-14 | I | Archivo vinculado a Movimiento 123 dentro del control y a Movimiento 124 precontrol, ambos en detalle | Archivo excluido; 123 ya está en `detalleControl` y no se suma otra vez; 124 entra una vez como precontrol; no doble | Bun Test del combinador | Documental ahora; API futuro | DTO con vínculo | UNRUN — diseño |
| AC-15 | I | Abrir procedencia de un registro | Huella, hoja/tabla, fila/columna, ID de origen, extracción y mapping visibles; sin documento/datos personales | Playwright + revisión de DTO | Documental ahora; UI futuro | Captura 390/1440 y DTO | UNRUN — diseño |
| AC-16 | I (Q7) | Archivo con apertura histórica; comparar Saldo/Deuda antes/después | Aperturas vigentes idénticas; sin Movimiento/Saldo/Deuda nuevos | Bun Test de no mutación | Documental ahora; API futuro | Snapshot lógico | UNRUN — diseño |
| AC-17 | I (Q7) | Intentar sumar apertura histórica al ejecutado o al Saldo | No suma a Gastos; no escribe en Saldos/Deudas; evidencia separada | Bun Test + revisión de contrato | Documental ahora; API futuro | DTO y snapshot | UNRUN — diseño |
| AC-18 | I | Consultar 2027 tras 2026 con archivo/detalle | 2027 sin arrastre; `NoDisponible`; 2026 consultable | Bun Test de transición | Documental ahora; API futuro | Dos DTO separados | UNRUN — diseño |
| AC-19 | I | Ciclo con hechos en diciembre 2026 y enero 2027 | Asignación por año natural; totales separados; sin copia | Bun Test de transición | Documental ahora; API futuro | DTO por ejercicio | UNRUN — diseño |
| AC-20 | I (Q5) | Registro `Regularizacion2026` 50,00; consultar 2025/2026/2027 | Solo 2026; otros años sin cambio; sin regla general | Bun Test + UI | Documental ahora; API/UI futuro | DTO y captura | UNRUN — diseño |
| AC-21 | I (Q5) | Fila «Regularización» sin tipo/mapping aprobado | No se infiere; `Pendiente`/no verificable; no suma | Bun Test de mapping | Documental ahora; API futuro | Registro y motivo | UNRUN — diseño |
| AC-22 | I (Q5) | Regularización vinculada por identidad/origen; y regularización embebida en agregado sin registro separable | Vinculada se excluye una vez; embebida no se resta y total `NoVerificable` | Bun Test de doble cómputo | Documental ahora; API futuro | DTO con vínculo/motivo | UNRUN — diseño |
| AC-23 | C (E4.11) | Consultar E4.11 después de archivo | No se crea foto/cierre; `Archivo` y `Foto` distintos; sin conversión | Bun Test de contrato + revisión E4.11 | Documental ahora; contrato futuro | DTO con discriminante | UNRUN — diseño |
| AC-24 | I | Ejercicio sin archivo, sin control detallado y sin hechos | Estado vacío; no plan/Movimiento/foto/total 0 | Playwright + Bun Test | Documental ahora; UI/API futuro | Captura y DTO | UNRUN — diseño |
| AC-25 | I | POST/PATCH/DELETE a rutas de histórico | 405/422; sin escritura/importación; datos intactos | Bun Test API | Documental ahora; API futuro | Respuestas y snapshot | UNRUN — diseño |
| AC-26 | I | GET sin sesión y GET autenticado | 401 sin sesión; no-store; sin importes en logs/artifacts; sin SQL/stack | Bun Test de acceso + revisión de logs | Documental ahora; API futuro | Respuestas y logs revisados | UNRUN — diseño |
| AC-27 | I | Provocar carga, vacío, parcial, ambiguo y error de red | Estados diferenciados; sin 0/demo; reintento conserva filtros; foco | Playwright con intercepción de red | Documental ahora; UI futuro | Capturas/estados | UNRUN — diseño |
| AC-28 | I | Revisar 390 y 1440 | Tabla/tarjetas equivalentes, sin scroll horizontal; etiquetas/foco/teclado; estado no solo color | Playwright + inspección visual | Documental ahora; UI futuro | Capturas 390/1440 | UNRUN — diseño |
| AC-29 | C (E4.7) | E4.7 consume archivo+detalle y un caso con hueco | Total solo con cobertura completa; subtotal+motivo si no; sin duplicar amortización/Ciclo; Neto compartido/inversión/Comida en sus motores | Bun Test de contrato E4.7 | Documental ahora; consumidor futuro | DTO y matriz | UNRUN — diseño |
| AC-30 | C (E4.12) | E4.12 restaura fixture y compara con matriz esperada | IDs/mapping/intervalos/fuentes/regularización preservados; cobertura recalculada; fotos intactas; discrepancias listadas | Restore aislado + comparación | Documental ahora; E4.12 futuro | Informe de discrepancias | UNRUN — diseño |
| AC-31 | I | Cambiar mapping a nueva versión y consultar registros antiguos | Versión usada conservada; nueva versión no reescribe; destino por ID; auditoría visible | Bun Test de versionado | Documental ahora; API futuro | DTO y auditoría | UNRUN — diseño |
| AC-32 | I | Corte fuera del ejercicio/futuro; fila no verificada/sin mapping | 422 por corte; fila fuera del total con motivo; sin 0/asignación | Bun Test de validación | Documental ahora; API futuro | Respuestas 422/DTO | UNRUN — diseño |
| AC-33 | I | Detalle con Ingreso, Transferencia, Amortización y Gasto | Solo el Gasto entra en el total de Gastos; los demás no se suman | Bun Test del combinador | Documental ahora; API futuro | DTO de detalle | UNRUN — diseño |
| AC-34 | I | Gasto precontrol vinculado, vinculado dentro del control y sin vínculo | Precontrol vinculado cuenta una vez; vinculado dentro del control ya está en `detalleControl` y no se duplica; sin vínculo deja total `NoVerificable` | Bun Test del combinador | Documental ahora; API futuro | DTO con `detallePrecontrol` | UNRUN — diseño |
| AC-35 | I | Archivo agregado anual 1.200,00 y detalle parcial de septiembre 100,00 sin desglose separable | No se resta 100,00; se muestran ambos; total `NoVerificable`; no 1.100,00 | Bun Test del combinador | Documental ahora; API futuro | DTO con componentes | UNRUN — diseño |
| AC-36 | I | Archivo de septiembre y Gasto de septiembre con `representadoEnMovimientos=Desconocido` | Solapamiento no resoluble; total `NoVerificable`; sin exclusión/inclusión automática | Bun Test del combinador | Documental ahora; API futuro | DTO con motivo | UNRUN — diseño |
| AC-37 | I (Q7) | Archivo solo con `AperturaHistorica` que cubre el año; sin fuente/control de Gastos | Cobertura de Gastos `NoDisponible`; no 0,00 de Gastos; apertura aparte | Bun Test de cobertura | Documental ahora; API futuro | DTO de cobertura | UNRUN — diseño |
| AC-38 | I | SRC-1 alcance PAR100 control desde 28/08; SRC-2 alcance PAR205 control desde 01/08; Gasto PAR100 del 15/08; solapamiento parcial | Cada fuente conserva su corte/control y solo cubre su alcance; el Gasto PAR100 del 15/08 no se considera control por SRC-2; total `NoVerificable` si no hay vínculo; `Solapada` si hay solapamiento | Bun Test de cobertura por fuente/Partida | Documental ahora; API futuro | DTO con `fuentes[]`/`alcance` | UNRUN — diseño |

## Casos solicitados y trazabilidad

| Caso solicitado | AC | Fixture ficticio |
| --- | --- | --- |
| Archivo y detalle en el mismo año/Partida sin doble cómputo | AC-05, AC-06, AC-14 | F1/F2 de la especificación |
| Frontera exacta del corte y cobertura parcial | AC-06, AC-07, AC-08 | F2/F3 |
| Referencia renombrada conservando identidad mediante mapping | AC-03, AC-04, AC-31 | F6/F10 |
| Ausencia frente a cero | AC-09, AC-10, AC-11 | F4 |
| Duplicados y procedencia ambigua | AC-12, AC-13 | F5 |
| Aperturas preservadas | AC-16, AC-17 | F7 |
| Cambio de ejercicio sin fabricar movimientos o planes | AC-18, AC-19, AC-24 | F8 |
| Regularización de 2026 sin extrapolarla a otros años | AC-20, AC-21, AC-22 | F9 |
| Archivo distinto de fotografía/cierre | AC-01, AC-23 | F1 + foto ficticia |
| Consumidores futuros E4.7/E4.11/E4.12 | AC-29, AC-30 | Contratos, no implementación |
| Solo Gastos en el detalle | AC-33 | F17 |
| Precontrol anterior al control | AC-34 | F13 |
| Archivo agregado + detalle parcial sin resta | AC-35 | F11 |
| Representación en Movimientos desconocida | AC-36 | F16 |
| Apertura histórica no acredita cobertura de Gastos | AC-37 | F14 |
| Cortes/controles por fuente, alcance por Partida y solapamiento | AC-38 | F15/F18 |

## Regression checks (previstos, no ejecutados)

En el futuro desarrollo autorizado, además de los AC anteriores:

- `bun run typecheck` y `bun run build`.
- `bun run test` con regresiones E1.1–E1.6, E2.1–E2.6 y E4.1/E4.4 aplicables.
- Pruebas focales del combinador de cobertura: unión, hueco de un día, frontera
  inclusiva, cero verificado, ausencia, solapamiento, duplicado y ambigüedad.
- `bun run test:e2e` con recorridos 390/1440 de la pantalla Histórico y estados de
  carga/vacío/parcial/error.
- Restore aislado E4.12 cuando exista; no se declara ahora.
- `python3 scripts/verify --base <SHA> --head <SHA>` en el candidato estable.

No se ejecutan suites funcionales en esta fase documental. Un resultado futuro debe
distinguir PASS/FAIL/UNRUN y no atribuir PASS por diseño.

## Functional verification

No ejecutada. No hay candidato funcional. La única verificación de esta fase es
documental: estructura, enlaces, consistencia de AC/wireframes y QA independiente.

## Browser verification (web only)

No ejecutada. Se planifican capturas 390×844 y 1440×1000 de la pantalla Histórico y de
la ficha de procedencia en el futuro dev autorizado. No se declara accesibilidad WCAG
ni equivalencia visual por estos wireframes.

## Visual improvements (propuestas para la futura UI)

1. Hacer visible la cobertura y el corte en la cabecera, no en un tooltip.
2. Separar «archivo», «detalle», «sin clasificar» y «regularización 2026» con etiquetas
   textuales, no solo color.
3. Mostrar «—» para no calculable y «0,00 €» solo para cero verificado.
4. Llevar la procedencia/mapping a una ficha consultable en móvil, sin scroll horizontal.
5. Mantener el botón de filtros y el estado vacío diferenciados de «sin datos = 0».

## Limitations and next action

Limitaciones: DT7 no aprobado; mapping/corte/regularización reales no demostrados; no
hay implementación, fixtures ejecutables, navegador ni CI funcional en esta fase. No se
ha abierto Excel ni datos reales. La spec y los wireframes no están aprobados.

Próxima acción segura: Codex revisa el candidato documental, resuelve Q1–Q9/DT7 y
decide si aprueba spec/wireframes. Después, y solo con autorización separada, se
autorizaría el desarrollo de E4.5.
