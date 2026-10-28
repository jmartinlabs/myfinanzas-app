# 20 — E4.5 Histórico precontrol y transición de ejercicio: Test plan

Specification: [20-historico-precontrol-specification.md](20-historico-precontrol-specification.md)

Status: **APPROVED — DISEÑO DOCUMENTAL, NO EJECUTADO.** SPEC20 completa y este testplan
fueron aprobados por el usuario el 2026-10-28. No hay implementación, código, SQL,
migración, importador, Excel, datos reales ni despliegue. Los 59 AC siguen `UNRUN`; la
aprobación del testplan no es PASS funcional.
**D4/D14 aplicadas:** 59 AC documentales (`AC-01…AC-59`); el
[progress](20-historico-precontrol-progress.md) conserva el hito histórico de 47 AC y
registra la enmienda.

Base: `main` `3d70fd6` (2026-10-28); PR87 integrada. La base histórica de preparación
fue `1d539a8`; la rama se reconcilió con `main` `7073864` antes de integrar.
Los comandos de implementación se proponen para el futuro desarrollo autorizado; no se
ejecutan aquí. Cualquier fixture con importes es ficticio.

## Matriz de aceptación

| Acceptance ID | Clase/condición | Precondiciones y acción | Resultado esperado | Método/comando propuesto | Entorno/owner | Evidencia esperada | Resultado actual |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-01 | C (E4.11) | Fixture cross-contract con `tipoRegistro=Archivo` de E4.5 y `tipoRegistro=Foto` de E4.11; consultar contratos | Discriminantes `Archivo`/`Foto`; ninguno se etiqueta como otro; la foto no se recalcula desde archivo | Bun Test de contrato E4.11; no UI E4.5 | Documental ahora; contrato futuro | DTO cross-contract | UNRUN — diseño |
| AC-02 | I | Registro con `idOrigen`, huella y procedencia; recargar y restaurar copia ficticia | `idArchivo` estable/único/inmutable; origen y huella conservados; sin reutilización | Bun Test + restore aislado E4.12 | Documental ahora; API/restore futuro | Snapshot lógico y DTO | UNRUN — diseño |
| AC-03 | I | PAR100/REF100 renombrados; consultar archivo | Mismo ID/enlace; nombre vigente; nombre original en procedencia; total igual | Bun Test de mapping + Playwright | Documental ahora; API/UI futuro | DTO con `nombreOrigen`/`destinoId` | UNRUN — diseño |
| AC-04 | I | Fila con solo nombre y dos Partidas homónimas; otra con Partida correcta y Referencia pendiente | Mapping de Partida `Ambigua`/`Pendiente`, sin asignación; fila ambigua en «Sin clasificar» con importe/motivo; Referencia pendiente fuera de «Sin clasificar»; total global `NoVerificable` | Bun Test de mapping + API | Documental ahora; API futuro | Registro y motivo | UNRUN — diseño |
| AC-05 | I | Universo DT7 acreditado; archivo 01/01–27/08 1.200,00 + detalle 28/08–31/12 300,00; control 28/08; corte 31/12 con reloj posterior | Total 1.500,00 una vez; componentes 1.200/300; cobertura completa | Bun Test del combinador | Documental ahora; API futuro | DTO exacto con strings | UNRUN — diseño |
| AC-06 | I | Archivo 01/01–27/08 1.200,00; control desde 27/08; detalle 27/08–31/12 320,00 (20,00 el 27/08 + 300,00 después); DTO F2 separado | Solapamiento 27/08 no separable; total y subtotal `null`; archivo 1.200 + detalle 320 visibles; 20,00 en `conflictos[]`; `estadoCobertura=Solapada`, `estadoTotal=NoVerificable`; no 1.500 ni 1.520 como total/subtotal | Bun Test de frontera inclusiva | Documental ahora; API futuro | DTO con `Solapamiento` y componentes | UNRUN — diseño |
| AC-07 | I | Archivo hasta 30/06; detalle desde 01/08 | Hueco 01/07–31/07; cobertura `Parcial`; total `null`; subtotal; no 0 | Bun Test de unión de intervalos | Documental ahora; API futuro | Intervalos/huecos exactos | UNRUN — diseño |
| AC-08 | I | Cortes 27/08 y 28/08 sobre archivo/detalle contiguos | 27/08 solo archivo y cobertura hasta 27/08; si verificado, total hasta corte (`HastaCorte`), nunca anual; 28/08 incorpora detalle una vez | Bun Test de corte inclusivo | Documental ahora; API futuro | Dos DTO comparables | UNRUN — diseño |
| AC-09 | I | Universo DT7 acreditado; cobertura completa 01/01–31/12 con fuente/intervalo verificado y sin filas | Total 0,00 verificado; «sin hechos en intervalo cubierto»; no «No disponible» | Bun Test de cobertura vacía | Documental ahora; API futuro | DTO con `"0.00"` y estado | UNRUN — diseño |
| AC-10 | I | Sin archivo y control desde 01/09; consulta anual | Total `null`; motivo de cobertura anterior; no 0 | Bun Test | Documental ahora; API futuro | DTO con `motivo` | UNRUN — diseño |
| AC-11 | I | Registro 0,00 verificado vs ausencia en cobertura completa | 0 informado y ausencia se distinguen; ambos suman 0 sin confundirse | Bun Test + UI | Documental ahora; API/UI futuro | DTO y captura | UNRUN — diseño |
| AC-12 | I | Dos filas idénticas de misma fuente/identidad/huella | Un registro; total una vez; aviso de duplicado | Bun Test de deduplicación | Documental ahora; API futuro | Conteo y DTO | UNRUN — diseño |
| AC-13 | I | Dos fuentes distintas con mismo intervalo/Partida, aunque el importe difiera | Dos candidatos ambiguos; no suma ni elige por importe; total no verificable | Bun Test + UI | Documental ahora; API/UI futuro | DTO con `Ambigua` | UNRUN — diseño |
| AC-14 | I | Archivo vinculado a Movimiento 123 dentro del control y a Movimiento 124 precontrol, ambos en detalle | Archivo excluido; 123 ya está en `detalleControl` y no se suma otra vez; 124 entra una vez como precontrol; no doble | Bun Test del combinador | Documental ahora; API futuro | DTO con vínculo | UNRUN — diseño |
| AC-15 | I | Abrir procedencia de un registro | Huella, hoja/tabla, fila/columna, ID de origen, extracción y mapping visibles; sin documento/datos personales | Playwright + revisión de DTO | Documental ahora; UI futuro | Captura 390/1440 y DTO | UNRUN — diseño |
| AC-16 | I | Archivo con apertura histórica de Saldo (Q7=A); comparar Saldo/Deuda antes/después | Aperturas vigentes idénticas; sin Movimiento/Saldo/Deuda nuevos | Bun Test de no mutación | Documental ahora; API futuro | Snapshot lógico | UNRUN — diseño |
| AC-17 | I | Intentar sumar apertura histórica al ejecutado o al Saldo (Q7=A) | No suma a Gastos; no escribe en Saldos/Deudas; evidencia separada | Bun Test + revisión de contrato | Documental ahora; API futuro | DTO y snapshot | UNRUN — diseño |
| AC-18 | I | Consultar 2027 tras 2026 con archivo/detalle | 2027 sin arrastre; `NoDisponible`; 2026 consultable | Bun Test de transición | Documental ahora; API futuro | Dos DTO separados | UNRUN — diseño |
| AC-19 | I | Ciclo con hechos en diciembre 2026 y enero 2027 | Asignación por año natural; totales separados; sin copia | Bun Test de transición | Documental ahora; API futuro | DTO por ejercicio | UNRUN — diseño |
| AC-20 | I | Registro `Regularizacion2026` 50,00 con evidencia (Q5=A); consultar 2025/2026/2027 | Solo 2026; otros años sin cambio; sin regla general | Bun Test + UI | Documental ahora; API/UI futuro | DTO y captura | UNRUN — diseño |
| AC-21 | I | Fila «Regularización» sin tipo/mapping/evidencia aprobada (Q5=A) | No se infiere; `Pendiente`/no verificable; no suma | Bun Test de mapping | Documental ahora; API futuro | Registro y motivo | UNRUN — diseño |
| AC-22 | I | Regularización vinculada por identidad/origen; y regularización embebida en agregado sin registro separable (Q5=A) | Vinculada se excluye una vez; embebida no se resta y total `NoVerificable` | Bun Test de doble cómputo | Documental ahora; API futuro | DTO con vínculo/motivo | UNRUN — diseño |
| AC-23 | C (E4.11) | Consultar E4.11 después de archivo | No se crea foto/cierre; `Archivo` y `Foto` distintos; sin conversión | Bun Test de contrato + revisión E4.11 | Documental ahora; contrato futuro | DTO con discriminante | UNRUN — diseño |
| AC-24 | I | Ejercicio sin archivo, sin control detallado y sin hechos | Estado vacío; no plan/Movimiento/foto/total 0 | Playwright + Bun Test | Documental ahora; UI/API futuro | Captura y DTO | UNRUN — diseño |
| AC-25 | I | POST/PATCH/DELETE a rutas de histórico | 405/422; sin escritura/importación; datos intactos | Bun Test API | Documental ahora; API futuro | Respuestas y snapshot | UNRUN — diseño |
| AC-26 | I | GET sin sesión y GET autenticado | 401 sin sesión; no-store; sin importes en logs/artifacts; sin SQL/stack | Bun Test de acceso + revisión de logs | Documental ahora; API futuro | Respuestas y logs revisados | UNRUN — diseño |
| AC-27 | I | Provocar carga, vacío, parcial, ambiguo y error de red | Estados diferenciados; sin 0/demo; reintento conserva filtros; foco | Playwright con intercepción de red | Documental ahora; UI futuro | Capturas/estados | UNRUN — diseño |
| AC-28 | I | Revisar 390 y 1440 | Tabla/tarjetas equivalentes, sin scroll horizontal; etiquetas/foco/teclado; estado no solo color | Playwright + inspección visual | Documental ahora; UI futuro | Capturas 390/1440 | UNRUN — diseño |
| AC-29 | C (E4.7) | E4.7 consume archivo+detalle, hueco y corte abierto | Total solo con cobertura completa; con corte abierto puede ser `HastaCorte`, nunca anual; subtotal+motivo si no; sin duplicar amortización/Ciclo; Neto compartido/inversión/Comida en sus motores | Bun Test de contrato E4.7 | Documental ahora; consumidor futuro | DTO y matriz | UNRUN — diseño |
| AC-30 | C (E4.12) | E4.12 restaura fixture y compara con matriz esperada | IDs/mapping/intervalos/fuentes/regularización preservados; cobertura recalculada; fotos intactas; discrepancias listadas | Restore aislado + comparación | Documental ahora; E4.12 futuro | Informe de discrepancias | UNRUN — diseño |
| AC-31 | I | Cambiar mapping a nueva versión y consultar registros antiguos | Versión usada conservada; nueva versión no reescribe; destino por ID; auditoría visible | Bun Test de versionado | Documental ahora; API futuro | DTO y auditoría | UNRUN — diseño |
| AC-32 | I | (a) Corte futuro; (b) ejercicio abierto con fixture calculado a 31/12; (c) apertura de ejercicio abierto | (a) 422; (b) corte 27/10, no 31/12; no 300/1.500; con evidencia, total hasta corte (`HastaCorte`); sin evidencia, `null`; (c) no total anual | Bun Test de validación | Documental ahora; API futuro | Respuestas 422/DTO | UNRUN — diseño |
| AC-33 | I | Detalle con Ingreso, Transferencia, Amortización y Gasto | Solo el Gasto entra en el total de Gastos; los demás no se suman | Bun Test del combinador | Documental ahora; API futuro | DTO de detalle | UNRUN — diseño |
| AC-34 | I | Gasto precontrol vinculado, vinculado dentro del control y sin vínculo | Precontrol vinculado cuenta una vez; vinculado dentro del control ya está en `detalleControl` y no se duplica; sin vínculo deja total `NoVerificable` | Bun Test del combinador | Documental ahora; API futuro | DTO con `detallePrecontrol` | UNRUN — diseño |
| AC-35 | I | Archivo agregado anual 1.200,00 y detalle parcial de septiembre 100,00 sin desglose separable | No se resta 100,00; se muestran ambos; total `NoVerificable`; no 1.100,00 | Bun Test del combinador | Documental ahora; API futuro | DTO con componentes | UNRUN — diseño |
| AC-36 | I | Archivo de septiembre y Gasto de septiembre con `representadoEnMovimientos=Desconocido` | `Desconocido` no contribuye a total certificado; sin evidencia de ausencia de duplicidad no entra en subtotal; contexto explicado; sin exclusión/inclusión automática | Bun Test del combinador | Documental ahora; API futuro | DTO con motivo | UNRUN — diseño |
| AC-37 | I | Archivo solo con `AperturaHistorica` de Saldo que cubre el año; sin fuente/control de Gastos (Q7=A) | Cobertura de Gastos `NoDisponible`; no 0,00 de Gastos; apertura aparte | Bun Test de cobertura | Documental ahora; API futuro | DTO de cobertura | UNRUN — diseño |
| AC-38 | I | SRC-1 alcance PAR100 control desde 28/08; SRC-2 alcance PAR205 control desde 01/08; Gasto PAR100 del 15/08; solapamiento parcial | Cada fuente conserva su corte/control y solo cubre su alcance; el Gasto PAR100 del 15/08 no se considera control por SRC-2; total `NoVerificable` si no hay vínculo; `Solapada` si hay solapamiento | Bun Test de cobertura por fuente/Partida | Documental ahora; API futuro | DTO con `fuentes[]`/`alcance` | UNRUN — diseño |
| AC-39 | I | Archivo agregado 01/01–27/08 1.200,00 sin desglose; consulta a 30/06 | No se prorratea ni se recorta; total/subtotal `null`; `estadoCobertura=Completa`, `estadoTotal=NoVerificable`, `motivoCodigo=AgregadoNoAtribuibleAlCorte`; no 1.200,00 como ejecutado hasta 30/06 | Bun Test de corte/agregado | Documental ahora; API futuro | DTO con `agregadoNoAtribuible[]` y motivo | UNRUN — diseño |
| AC-40 | I | Archivo v1 1.200,00 sustituido por v2 1.150,00 con `reemplazaA`; consultar | Solo v2 suma; v1 visible como historia; no 2.350,00; cadena bifurcada `NoVerificable` | Bun Test de versiones | Documental ahora; API futuro | DTO con versión vigente/histórica | UNRUN — diseño |
| AC-41 | I | Renombrar PAR100/REF100; después reclasificar un registro de PAR100 a PAR200 con nueva versión de mapping/archivo | Renombrado conserva ID/enlace y no crea versión; reclasificación crea versión nueva, conserva clasificación original y solo la vigente suma | Bun Test de mapping/versiones | Documental ahora; API futuro | DTO con versión y mapping usados | UNRUN — diseño |
| AC-42 | C (E2.4) | (a) Agregado sin fecha económica explícita con fechaDocumento/extracción/intervalo; (b) fecha económica acreditada 15/06; (c) Gasto 20/06; (d) sin fechas | (a) `fecha=null`; no documento/extracción/intervalo; (b) aceptada; (c) `fechaEjecutada=20/06`; (d) `null` | Bun Test de contrato E2.4 | Documental ahora; contrato futuro | DTO E2.4/fecha|null | UNRUN — diseño |
| AC-43 | I | Fuente con apertura de Deuda Dxxx; consultar archivo y Deuda (Q7=A) | No se enlaza ni suma; «No soportado por E4.5; ver E4.4»; Dxxx/capital/condiciones intactos; `aperturas=null` si no hay evidencia de Saldo | Bun Test de aperturas | Documental ahora; API futuro | DTO y snapshot de Deuda | UNRUN — diseño |
| AC-44 | I | Agregado 01/01–27/08 y detalle 01/01–30/06, sin vínculo ni disyunción aprobada | No se prioriza detalle; total `NoVerificable`; no total solo-detalle; Q10=A aplicada. Con vínculo/disyunción, agregado excluido y detalle una vez | Bun Test de corte/agregado + vínculo | Documental ahora; API futuro | DTO con `agregadoNoAtribuible[]` y motivo | UNRUN — diseño |
| AC-45 | I | Mover PAR100 de SUB-A a SUB-B sin cambiar ID; consultar archivo e historia | E1.2: impacto, motivo, confirmación, revisión/huella y protecciones; `partida.jerarquiaVigente` SUB-B y `procedenciaJerarquia` SUB-A; sin versión de catálogo ni reescritura; sin impacto/motivo/confirmación -> bloqueo/conflicto de revisión (409 como ejemplo) | Bun Test de impacto E1.2 + UI | Documental ahora; API/UI futuro | DTO de jerarquía/procedencia y conflicto | UNRUN — diseño |
| AC-46 | I | (a) Candidatos sin universo DT7 acreditado; (b) universo acreditado y fuente esperada ausente; (c) universo acreditado, fuentes presentes y sin hechos; (d) una Partida completa y otra sin intervalo | (a) `NoAcreditada`/`NoVerificable`, no `Parcial`/0; (b) `Parcial`/`FuenteAusente`; (c) `Completa` y 0 verificado; (d) global `Parcial`, no `NoDisponible`; `NoDisponible` solo si ninguna Partida cubierta | Bun Test de cobertura/universo | Documental ahora; API futuro | DTO con `estadoUniverso`/`fuentesEsperadas` | UNRUN — diseño |
| AC-47 | I | (a) Filtro SRC-1 con PAR205 sin SRC-1; (b) conflicto SRC-2; (c) nueva versión de SRC-1 | (a) «No cubierta», no 0; (b) conflicto visible, `total=null`, `NoVerificable`, `subtotalFuente` decimal/null no certificado; (c) mismo `fuenteId` | Bun Test de filtro/combinador | Documental ahora; API futuro | DTO `vista=Filtrada`/conflictos globales | UNRUN — diseño |
| AC-48 | I (D4) | Archivo con Partida/importe/intervalo/clase verificados, `representadoEnMovimientos=No`, Referencia pendiente que no cambia atribución, sin `procedencia.idOrigen` | Suma al total por Partida; `idArchivo`/huella/procedencia trazable bastan; `referenciaId=null`; `referenciaOrigen` visible; `estadoMapeoReferencia=Pendiente`; desglose `Incompleto`; no `sinClasificar`; no `REFxxx` | Bun Test de contrato D4 | Documental ahora; API futuro | DTO con mapping/procedencia | UNRUN — diseño |
| AC-49 | I (D4) | Igual que AC-48, pero la Referencia podría cambiar Partida/elegibilidad/identidad/deduplicación | Total global y Partida afectada `NoVerificable`; no candidato, no suma, no exclusión por conveniencia | Bun Test de contrato D4 | Documental ahora; API futuro | DTO con `NoVerificable`/motivo | UNRUN — diseño |
| AC-50 | I (D4) | `representadoEnMovimientos=Si`, `Desconocido` y `No` acreditado | `Si` excluye el archivo y el Movimiento cuenta una vez; `Desconocido` no entra en total; solo `No` suma; `Desconocido` no entra en subtotal sin evidencia de no duplicidad | Bun Test del combinador | Documental ahora; API futuro | DTO con estados y vínculo | UNRUN — diseño |
| AC-51 | I (D4) | Completar mapping de Referencia sin cambiar Partida; después cambiarla a otra Partida | Primer caso: total por Partida no cambia, desglose completo; segundo: reclasificación/conflicto, total bloqueado, sin recálculo silencioso | Bun Test de mapping/versionado | Documental ahora; API futuro | DTO y auditoría | UNRUN — diseño |
| AC-52 | I (D4) | `Regularizacion2026` con Referencia pendiente sin evidencia Q5=A; después con evidencia y Partida/importe acreditados | Sin evidencia: no suma; con evidencia: aplica D4; nunca por nombre/parecido | Bun Test de regularización | Documental ahora; API futuro | DTO y evidencia | UNRUN — diseño |
| AC-53 | I (D14) | Partida A `Completa` y Partida B `NoDisponible` | Global `Parcial`; estados por Partida; `NoDisponible` no se propaga; total según cobertura | Bun Test de cobertura | Documental ahora; API futuro | DTO `items[]`/global | UNRUN — diseño |
| AC-54 | I (D14) | Solape no resuelto en una Partida, resto completo | Global `Solapada`; `total=null`; no fuente elegida ni prorrateo | Bun Test de cobertura | Documental ahora; API futuro | DTO con `conflictos[]` | UNRUN — diseño |
| AC-55 | I (D14) | Sin universo acreditado, con importes verificados/no conflictivos/separable y un `Desconocido` sin evidencia de no duplicidad | `NoAcreditada`; `subtotalConocido` solo con importes separables y sin el `Desconocido`; `total=null`; nunca 0 ni total certificado | Bun Test de subtotal | Documental ahora; API futuro | DTO con subtotal/motivo | UNRUN — diseño |
| AC-56 | I (D14) | Cobertura completa a 30/06; después a 31/12; después condición incumplida | A 30/06: `Verificado`, total hasta corte, `alcanceTotal=HastaCorte`, no anual; a 31/12: `Anual`; si falla condición: `total=null` | Bun Test de corte/alcance | Documental ahora; API futuro | DTO con `alcanceTotal` | UNRUN — diseño |
| AC-57 | I (D4/D14) | Total por Partida verificado con desglose por Referencia `Incompleto` | El total por Partida se certifica; el desglose por Referencia no; no se presenta como completo | Bun Test de contrato | Documental ahora; API futuro | DTO con estados separados | UNRUN — diseño |
| AC-58 | C (E2.4) | Histórico con Referencia pendiente y Partida/importe/unicidad acreditados; después ambigüedad de atribución; corte abierto | `Ejecutado` incluye el importe; `Diferencia` calculable; con ambigüedad: `Ejecutado=null`, `Diferencia=null`, motivo; total hasta corte no anual; subtotal etiquetado | Bun Test de contrato E2.4 | Documental ahora; consumidor futuro | DTO E2.4 | UNRUN — diseño |
| AC-59 | I (D4) | Fuente sin Referencia declarada vs fuente que la declara sin destino; registro con Partida pendiente | `NoAplica` solo con evidencia de ausencia; si declara, `Pendiente/Ambigua`; Partida pendiente visible en `sinClasificar` con importe/motivo y total `NoVerificable` | Bun Test de mapping | Documental ahora; API futuro | DTO con `sinClasificar` | UNRUN — diseño |

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
| Agregado que excede el corte sin prorrateo | AC-39 | F19 |
| Detalle completo pero conflicto con agregado no demostrado | AC-44 | F19b |
| Cambio de jerarquía con el mismo PARxxx | AC-45 | F24 |
| Universo no acreditado, fuente ausente y ausencia verificada | AC-46 | F25 |
| Filtro por fuente no consolidado y conflictos globales | AC-47 | F26 |
| Ejercicio abierto con corte no futuro y sin importes trasladados | AC-32 | F27 |
| Corrección/versionado sin sumar original y sustitución | AC-40 | F20 |
| Renombrado vs reclasificación | AC-41 | F21 |
| Fecha ejecutada de E2.4 sin fecha inventada | AC-42 | F22 |
| Apertura de Deuda fuera de E4.5 | AC-43 | F23 |

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

Limitaciones: Q1–Q10 confirmadas; DT7 no aprobado; mapping/corte/regularización reales no demostrados; no
hay implementación, fixtures ejecutables, navegador ni CI funcional en esta fase. No se
ha abierto Excel ni datos reales. La spec y los wireframes no están aprobados.

Próxima acción segura: Codex revisa y puede publicar; solo el usuario aprueba
spec/wireframes; DT7 sigue como gate independiente. Después, y solo con autorización
separada, se autorizaría el desarrollo de E4.5.
