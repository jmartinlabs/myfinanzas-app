# 39 — Devoluciones de compras: Specification

Status: **APROBADA — 2026-11-22**. Los **45 AC** permanecen **UNRUN**: la aprobación es del
contrato, no de su ejecución.
Approval source/date: mensaje humano directo del 2026-11-22, «apruebo formalmente la SPEC de #538,
conforme al veredicto APTO de Álex y la documentación integrada en `test` (`765094cd`)», con los
45 AC en UNRUN, el §7 reconciliado con SPEC33-E1 y §9/§11 con la dependencia obligatoria de SPEC14.
Veredicto previo: revisión de Álex del 2026-11-22 sobre `765094cd`, **APTO**.
Procedencia: #538. Texto normativo del §1 al §14 tomado del comentario `7024602562` sin
reescritura; las correcciones posteriores se integran abajo con su origen.
**NO AUTORIZA DEV, MIGRACIONES, CAMBIOS DE DATOS NI DESPLIEGUE.** Son decisiones independientes:
la **aprobación de SPEC14-E1, ya cumplida el 2026-11-23** (PR #562, merge `97128152`); su **DEV e
integración, aún pendientes**; y la autorización expresa de DEV de #538.

## Estado y dependencias

- 45 AC (`AC-D01`…`AC-D45`) **UNRUN**.
- §7 reconciliado con [enmienda 33-E1](33-dprima-simplificada-enmienda-01.md): `P` y apertura
  inmutables, `P(t)` prospectivo con corte acreditado, compromiso de aportación separado de la
  ejecución real y vínculo 1:1 con la transferencia.
- §9/§11: **SPEC14-E1 es dependencia obligatoria**. Su aprobación está cumplida (2026-11-23,
  [enmienda 14-E1](14-compartidos-enmienda-01.md)); su **DEV e integración siguen pendientes** y
  son necesarios antes de exponer la regularización. `AC-D25` queda condicionado por esa
  dependencia hasta entonces. La acreditación a terceros no queda cubierta por v32.

# Contrato (§1–§14, 45 AC)

Autor: Hermes
Rol: Coordinador técnico
Fase: Specification
Tipo: V4 · reconciliación de interfaces

> Aplica el [anexo de interfaces compartido](https://github.com/jmartinlabs/myfinanzas-app/issues/547#issuecomment-7024601095) publicado en #547 y cierra los hallazgos de la verificación. Las versiones anteriores **no se borran**. **No autoriza DEV ni migraciones.**

# SPEC v2 · Devoluciones de compras (#538) — revisión v2c

**Contrato compartido normativo:** [anexo de interfaces de SPEC38](38-e49b-cierre-validacion-interfaces.md), §§1–6; fuente única de códigos, shapes, estado proyectado, gate, Partida y reatribución. Esta reconciliación no autoriza DEV ni declara AC ejecutados.

**Fecha:** aprobada el 2026-11-22. **Estado:** SPEC aprobada; **45 AC en UNRUN**. No autoriza DEV, migraciones, cambios de datos ni despliegue.

**Base inspeccionada:** `test`, `765094cd`, con SPEC38 y la enmienda 33-E1 integradas. Texto normativo tomado del comentario `7024602562` de #538 sin reescritura; la política de disponibilidad operativa del 19/11 quedó **descartada** y se sustituye por el contrato aprobado de 33-E1 (§7). Veredicto APTO de Álex y aprobación formal del usuario el 2026-11-22.

## 1. Objeto, límites y propiedad

La devolución comercial monetaria es un hecho bancario real de tipo `Devolución de gasto`, relacionado por ID con un Gasto original. La relación es 1:N, sin reparto de un abono entre compras, sin REF técnica nueva, sin Ingreso ni transferencia ficticia.

**Decisión cerrada:** compra de 120 € en ciclo A, abono de 30 € en B: gasto real económico (GRE) de A = 90 €, banco receptor +30 € en la fecha real de B. No gasto negativo de B, no financiación nueva de B ni presupuesto operativo disponible retroactivo. Lo mismo si A está validado o es de otro ejercicio.

#538 posee predicado económico, integridad, transiciones y consumidores. #539 posee U-1 (alta desde Gasto y navegación). #549 posee U-2 (integración visual de advertencia/confirmación/dirty). #547 posee exclusivamente el motor de impacto, informes vivos, validación y dirty, y la migración v32. #548 retira fotos después del desacople y aceptación. Aprobar esta SPEC no autoriza desarrollar ninguna de ellas.

Se reutilizan `movimientos`, `movimiento_devolucion`, auditoría y ledger. No se abre una tercera historia de devoluciones. Fuera: cashback, vales, solicitudes aún no abonadas, conversión masiva de transferencias, relaciones genéricas y nueva pantalla histórica congelada. Excel y datos reales no se han abierto.

## 2. Magnitudes, periodos y presentación

### 2.1 Tres contratos separados

- **GRE:** suma de Gastos vigentes del conjunto de compras menos devoluciones económicamente elegibles vinculadas a esas mismas compras. Responde a «cuánto costaron». El bruto permanece en el hecho original.
- **Disponibilidad operativa (DO):** cantidades que habilitan comprometer/aportar/transferir. `presupuesto − GRE` es desviación analítica, no dinero disponible. No alimentar DO con esa diferencia.
- **Hecho/flujo bancario:** importe, saldo y fecha reales del movimiento. La devolución aumenta solo su receptor al cobrarse, no es Ingreso ni se fecha en A.

Los importes se calculan en céntimos enteros con bigint; DTO monetarios en string decimal EUR, no number. Las fórmulas de esta SPEC se expresan en céntimos. Fechas civiles ISO. Ausencia/no verificable no se sustituye por cero.

### 2.2 Periodos

`cicloDe(compra.fecha)` se resuelve por intervalo real del maestro Ciclos (Inicio y Fin/corte derivados), nunca por mes natural del abono. El mes/ejercicio financiado se obtiene del maestro, no del año del Inicio. Para Plan anual y vistas de ejercicio natural se filtra por fecha de compra entre 1 de enero y 31 de diciembre. Una suma de ciclos financiados no se declara equivalente al año natural sin conciliar ventanas. FB usa fecha real del abono. Las ventanas bancarias a corte excluyen abonos posteriores al corte aunque estos ya afecten al GRE vivo.

### 2.3 Compatibilidad de nombres

Se conservan claves existentes como `executed`, `ejecutado`, `devoluciones`, `neto`, `gasto` o `S` cuando el DTO y el contexto fijan inequívocamente significado, unidad, periodo, cobertura y fuente. No se impone un marcador `semantica` ni una prohibición global de nombres breves. La UI permite «Ejecutado» bajo un encabezado «Gasto real económico (neto)», y «Gasto» bajo «Flujo bancario bruto». Una etiqueta contextual no convierte una cifra económica en operativa.

Nuevos campos tienen nombres explícitos. Las claves antiguas no se renombran por estilo; cuando cambia su valor semántico se declara y se actualizan todos sus clientes en la misma entrega. Campos aditivos requieren pruebas de deserialización y consumidores. No se afirma «no cambia la forma»: hay ampliaciones de lectura y una nueva precondición de escritura (§5).

## 3. Proyección económica y cobertura únicas

### 3.1 Predicado y clasificación

Una devolución netea si y solo si:
1. Su movimiento es vigente y de tipo `Devolución de gasto`.
2. Existe compra, vigente, de tipo `Gasto`, con origen no Terminal.
3. El vínculo está `Verificado` y la elegibilidad es `Acreditada`, con evidencias exigidas.
4. Se puede resolver el ámbito de compra requerido por el consumidor.

La clasificación SIEMPRE se deriva de la compra vigente: Concepto, Categoría/Subcategoría, Partida y Referencia de negocio. Las copias antiguas `d.partida`, `m.partida` y `d.ciclo_origen` no son fallback ni selector para una devolución vinculada. La precedencia actual `d.partida ?? m.partida ?? compra.partida` (`dprima.ts:1261`) se elimina. En el alta no se copian Concepto/Categoría/Partida/REF a la devolución ni Partida al vínculo; el movimiento técnico conserva solo los campos propios exigidos por su tipo. El ciclo almacenado exigido para acreditación por el esquema se deriva al escribir de la compra; es metadato compatible, nunca fuente de lectura económica.

Cambiar clasificación, REF o fecha de compra reatribuye bruto y descuento conjuntamente. Un subconjunto por REF/Partida selecciona primero IDs de compras vigentes y resta exclusivamente sus devoluciones elegibles. No se consulta una bolsa global de descuentos por Partida. Si falta Partida, no se inventa: el neto global sigue siendo trazable por compra, pero el agregado clasificado se declara parcial con `sinClasificacion`.

### 3.2 Históricos: política única

Toda devolución sin compra se lee y conserva como hecho bancario y se marca `sinVinculo`; **no netea GRE**, aunque tenga `Acreditada`, evidencia, Partida o ciclo declarados. No se inventan compras ni se hacen conversiones/backfill masivos. Un vínculo `Revisar`, compra inválida o movimiento anulado no netea. Los importes excluidos son visibles con ID y causa; no se declara cobertura completa por publicar cero descuentos.

Una única proyección deriva elegibilidad, dimensiones, importe, periodo, cobertura y diagnósticos. Los consumidores la restringen por su conjunto de compras; no reimplementan SQL temporal incompatible. `atribucionReexpresada` compara almacenado y derivado en lectura: no se persiste ni exige corregir la fila para mostrar el GRE correcto.

### 3.3 Cobertura

Causas: `sinVinculo`, `revisar`, `sinAcreditacion`, `sinClasificacion`, `compraInvalida`, `periodoNoResoluble`. La cobertura se limita al ámbito demostrable: no asignar un huérfano a Comida por su mera declaración histórica; los huérfanos desconocidos se muestran en integridad global, con advertencia de cobertura no atribuible. Una compra ajena a Comida no degrada Comida. `OTRO_CICLO` es información bancaria, no causa de inelegibilidad ni de cobertura parcial.

## 4. Tope bancario y descuento económico

Para cada compra:
- `devueltoVerificado`: suma de importes de movimientos de devolución vigentes con vínculo `Verificado`, **incluidos No acreditada**. Es el conjunto que suma el trigger (`comida-schema.ts:179-198`).
- `capacidadBancariaRestante = bruto − devueltoVerificado`.
- `descuentoEconomico`: suma del subconjunto elegible según §3.
- `gastoRealEconomico = bruto − descuentoEconomico`.

No son sinónimos capacidad restante, GRE y pendiente de acreditación. Una devolución Verificada No acreditada de 30 sobre 120 deja capacidad 90, descuento 0 y GRE 120. Pasarla a Acreditada cambia descuento/GRE, no vuelve a consumir capacidad. Las filas Revisar se enumeran con importe, sin prometer reserva de capacidad; resolverlas como Verificado revalida el tope. En un histórico inconsistente no se oculta el exceso con `max(…,0)`: capacidad no disponible y diagnóstico con exceso firmado; bloquear nuevas verificaciones hasta resolverlo individualmente.

El formulario bloquea un importe que exceda la capacidad de **esa compra**, y el servidor revalida bajo bloqueo de escritura. Texto M-1: **«El importe supera la capacidad restante de esta compra. Revisa sus devoluciones y la compra vinculada. No se puede registrar este exceso como devolución de esta compra; puede requerir aclarar el abono o corregir hechos existentes, y no se garantiza que sea resoluble por este flujo.»** No ofrecer guardar una nueva alta en Revisar como bypass del exceso.

## 5. API, una sola proyección de lectura y concurrencia

### 5.1 Alta y atribución: rutas distintas

**Alta canónica:** `POST /api/movimientos` con `tipo='Devolución de gasto'` y `body.devolucion.compra`, invocado exclusivamente desde «Registrar devolución» del Gasto. Crea un solo movimiento y vínculo atómicamente (`movimientos.ts:1093-1106`). Campos de usuario: importe positivo realmente abonado, fecha real, saldo receptor bancario (por defecto el pagador, editable), evidencia/confirmación; compra fijada por ID. El servidor deriva clasificación y ciclo. No admitir alta huérfana desde API ni alta genérica independiente en Movimientos; sin `compra` → `422 DEVOLUTION_LINK_REQUIRED`. Clasificación independiente contradictoria → `422 VALIDATION`, no copia silenciosa.

`POST /api/comida/{id}/devolucion` **atribuye/rectifica un movimiento de devolución preexistente**; `{id}` es ID de devolución, no ID de compra. No crea movimiento ni abona otra vez el banco (`app.ts:939-951`, `writeComidaDevolucion`). El saneamiento histórico entra desde la fila identificada, con compra seleccionada y acreditada individualmente, no con sugerencias que confirmen hechos. R4 no es selector ni sanea por sí mismo. Se retira escritura legacy `POST /api/revision-comida` con `esDevolucion:true` (`422 DEVOLUTION_LEGACY_WRITE`); su lectura histórica permanece.

### 5.2 R1 y resumen R3

R1: `GET /api/comida/compras/{id}/devoluciones`. Una única función `proyeccionDevolucionesCompra` (nombre técnico propuesto, no otra entidad persistida) produce:

```text
{ compra:{id,fecha,importe,partida,referencia,cicloAtribucion},
  resumen:{count,bruto,devueltoVerificado,capacidadBancariaRestante,
           descuentoEconomico,gastoRealEconomico,pendienteRevision,
           cobertura,causas,ids},
  items:[{id,fecha,importe,saldoReceptor,estado,elegibilidad,
          revision,devolucionRevision,cicloDerivado,cicloAlmacenado,
          diagnosticos,evidencias}], page,total }
```

Los dos campos de negocio que la UI debe distinguir son `capacidadBancariaRestante` y `descuentoEconomico`. `pendienteRevision` es suma informativa de Revisar, no crédito reservado ni capacidad. El resumen abarca todos los items, no solo la página. Count/total se calculan sobre el mismo conjunto. `404` inexistente; `422` no Gasto/Terminal; para compra anulada histórica se devuelve diagnóstico y alta no habilitada, sin impedir trazabilidad.

R3: `GET /api/movimientos/{id}` añade `devolucionesResumen` para Gastos: exactamente `resumen` de R1, misma función y snapshot de lectura, sin segunda consulta semántica divergente. No se conserva alias de capacidad: el campo único es `resumen.capacidadBancariaRestante` (ANEXO-INTERFACES §2). Las lecturas no cambian revisiones, auditoría ni dirty.

R2 (selector general de abonos desligados) no existe. R4: `GET /api/devoluciones/integridad`, inventario paginado de `sinVinculo`, `reexpresadas`, `vinculoInvalido`, `exceso`, con ID, causa y valores almacenado/derivado pertinentes. Solo lectura; diagnósticos calculados, nunca persistidos. No convierte ni propone compra automáticamente.

### 5.3 Revisiones y clientes como unidad de entrega

`revision` compara contra movimiento; `devolucionRevision` contra `movimiento_devolucion.revision`, no intercambiables. La columna propia ya existe (`comida-schema.ts:144-145`): **sin backfill**. En alta no existe atribución previa; en actualización/atribución existente se exige su revisión real. Revisión ausente en actualización es `422 VALIDATION`; obsoleta → `409 ATTRIBUTION_REVISION_CONFLICT`; movimiento obsoleto → `409 REVISION_CONFLICT`. R1 y el detalle de atribución deben suministrar ambos valores.

**Dependencia obligatoria de entrega:** actualizar `Comida.tsx:773-782`, su DTO y manejador, además de Movimientos y #539, para leer/enviar `devolucionRevision`. No desplegar servidor estricto con cliente antiguo. Lectura de fila histórica devuelve su revisión actual, nunca una revisión inventada. Pruebas de cliente incluyen pérdida/recarga de revisión tras conflicto.

### 5.4 Idempotencia, duplicados y errores

Misma clave + mismo payload → mismo resultado y un solo movimiento/vínculo/auditoría; distinto payload → `409 IDEMPOTENCY_CONFLICT`. Incluir compra y estado en comparación de coincidencias; compra distinta no es coincidencia de esa relación. Coincidencia aceptada exige confirmación y evidencia duradera en auditoría append-only (huella, campos de identificación y aceptación), no en intentos purgables. No añadir acción incompatible al CHECK de auditoría. Nunca saltarse el tope por aceptar coincidencia.

Códigos adicionales: `422 DEVOLUTION_EXCESS`, `422 PURCHASE_BELOW_REFUNDED`, `422 DEVOLUTION_LINKED` (operación incompatible sobre compra), `422 ATTRIBUTION_EXISTS` (retipificación/eliminación de devolución atribuida), `422 DEVOLUTION_ORIGIN_MISMATCH` si se envía ciclo contradictorio, `404 NOT_FOUND`, `409 IMPACT_CHANGED` del motor #547. Preview y escritura devuelven mismo error de dominio; ningún error deja escritura parcial. Aplican acceso/CSRF/no-store/validaciones existentes, sin nuevo sistema de permisos.


### 5.5 Interfaces cerradas

Se incorporan literalmente por referencia los shapes R1/R3, preview.devolucionImpacto, confirmacion.cierresDirty y R5 del ANEXO-INTERFACES §2; son contrato publicado de esta SPEC, no una petición de consumidores. En particular publica receptor.saldoAntes/saldoDespues, devueltoAntes/devueltoDespues, signoGasto incluido invariante, estadoValidacion/validado/dirtyPrevio, partidaResuelta y flujoBancarioImporte/flujoBancarioFecha. R5 añade importeMin/importeMax con filtros y paginación allí fijados. La ruta de atribución también reatribuye según §6 del anexo; #539 ofrece ambas acciones. Atribuir exige preview/confirmación aunque el banco no cambie.

## 6. Contrato de transiciones que #539 y #549 citan

**Texto literal reutilizable (este bloque completo):**

> Una compra con devoluciones vinculadas vigentes no puede anularse, eliminarse ni retipificarse; se rechaza la operación con DEVOLUTION_LINKED, sin modificar compra, vínculos, banco ni auditoría de hechos. Una reducción del importe que deje el bruto por debajo del acumulado de devoluciones vigentes Verificadas, incluidas las No acreditadas, se rechaza con PURCHASE_BELOW_REFUNDED. Una reducción que respete ese límite se permite y conserva los vínculos Verificados; no los degrada. Un cambio válido de clasificación, Referencia o fecha conserva el vínculo, deriva de la compra la nueva atribución y aplica el impacto de #547. No existe degradación automática para hacer pasar una escritura incompatible. La degradación a Revisar solo es una rectificación explícita, individual, motivada y auditada de la atribución, con revisión propia y advertencia de impacto; conserva el hecho bancario y no habilita anular una compra mientras siga vinculada una devolución vigente. Para anular o retipificar la compra deben resolverse antes sus devoluciones vigentes mediante corrección o anulación real y auditada, o reatribución individual a otra compra válida con evidencia, revisiones y tope; nunca mediante desvinculación huérfana de una devolución nueva. Los vínculos de devoluciones anuladas se conservan para trazabilidad y no consumen tope ni impiden por sí solos anular la compra; no se permite borrar físicamente la compra referenciada. Los históricos ya inconsistentes se conservan y diagnostican sin degradación silenciosa; cualquier saneamiento es individual y explícito. Restaurar o desanular exige repetir estas mismas guardas antes de confirmar. Ningún cierre exige reapertura ni produce HISTORY_LOCKED: #547 aporta advertencia, confirmación y dirty informativo solo por impacto material.

**Delta frente al código actual:** `revalidateDevolucionesCompra` en `comida.ts:1175-1215` recorre Verificados y, si compra anulada/no Gasto o total no cubierto, escribe `estado='Revisar',revision+1`; después audita (`:1216-1233`). Ese comportamiento NO es la transición autorizada para nuevas escrituras: la guarda se ejecuta antes de cambiar la compra y hace rollback completo. `revalidateDevolucionPropia` tampoco puede servir de bypass para aumentar importe por encima del tope. El predicado de lectura detecta históricos inválidos sin escribir. No se promete reparar toda inconsistencia restaurada: si una copia no pasa integridad, se aísla y no se expone escritura como si estuviera saneada.

Anular una devolución conserva vínculo, importe y fecha, retira su efecto bancario vigente y el descuento económico y libera capacidad. Desanular verifica compra vigente y capacidad dentro de la transacción. Rectificar importe/fecha/saldo de devolución válida aplica simultáneamente ledger, proyección e impacto; exceso se rechaza, nunca degrada automáticamente. Eliminación física no es vía de corrección.

## 7. Disponibilidad operativa: contrato aprobado (SPEC33-E1)

La norma vigente es la [enmienda 33-E1](33-dprima-simplificada-enmienda-01.md), aprobada el 2026-11-22. **`P = max(0, T − G − S)`** se mantiene con `G` gasto neto acumulado elegible y `S` saldo real exclusivo.

- **Fotografía de apertura inmutable:** `T`, `G₀`, `S₀` y `P₀ = max(0, T−G₀−S₀)` quedan fijados al corte confirmado. Una transferencia o devolución posterior **no** reescribe `P₀`.
- **Cálculo prospectivo `P(t)`:** `G(t)` y `S(t)` de hechos reales hasta un corte `t` **acreditado** —instante, fuente y revisiones—; es un cálculo nuevo, publicado separado y **nunca sustituto de `P₀`**.
- **Compromiso de aportación:** dato de planificación auditable (motivo, actor, instante, revisión, estado `Vigente|Ejecutada|Anulada`, `movimiento_id`). **No** altera `P`, ni `S`, ni crea Movimiento; su único efecto es `pendienteDeDecidir(t) = max(0, P(t) − Σ compromisos Vigentes a t)`.
- **Ejecución:** vínculo **1:1** entre transferencia real y compromiso, con transición a `Ejecutada` en la misma transacción del Movimiento. La doble financiación es imposible por construcción.
- **Sobrecompromiso:** se **señala y exige revisión humana**; no se anula nada automáticamente ni se altera el histórico. Ejecutar la transferencia **no** lo resuelve: reduce `P(t)` y puede agravarlo.

**Historia no normativa.** La política del 19/11 con `G_economico`, `G_operativo`, `R_saldo` y `S_operativo = S_bancario − R_saldo`, y su `P = max(T−G_operativo−S_operativo, 0)`, fue **descartada** el 2026-11-22. Se conserva en el comentario original de #538 como trazabilidad y **no impone reglas**. En particular, `R_saldo` no es una reserva vigente y `S_operativo` no es una magnitud del contrato.

`Aportación a saldo`, `aTransferir`, recursos Comida y arrastres operativos no se recalculan desde GRE. Cualquier lector de posiciones que financie ciclos por su cuenta debe usar este contrato; si la separación no puede implementarse y probarse, se bloquea la entrega integrada en lugar de afirmar que la disponibilidad operativa está preservada.

## 8. Comida

Una devolución entra en Comida solo por el ámbito real de su compra vigente (etiqueta/grupo o saldo ING Comida conforme a la vista). Netea su ciclo de compra aunque el abono llegue después y a otro saldo. No altera recursos/financiación ni crea segundo Movimiento. Compra de ámbito conocido Comida sin clasificación requerida → cobertura parcial `sinClasificacion`; ámbito desconocido no se declara Comida. Compras ajenas no degradan cobertura Comida. Se mantienen bruto, descuento y neto trazables y `OTRO_CICLO` informativo. La UI antigua de atribución debe cumplir §5.3 antes de entregar.

## 9. Gastos compartidos: fuentes, regularización y coste cero

`costeEconomicoCaso = bruto de compras vigentes del caso − descuentoEconomico de sus IDs`. El reparto usa los pesos actuales y algoritmo de céntimos/residuales determinista existente. `costeEconomicoTitular` es cuota del Titular; el Titular no tiene aportaciones acreditadas a sí mismo.

**Fuentes excluyentes:**
1. Descuento comercial: exclusivamente IDs de movimientos tipo `Devolución de gasto` con vínculo elegible.
2. Aportación de tercero: acreditación vigente de cobro real de participante, tipo/dirección admitidos por Compartidos; excluir explícitamente cualquier ID de devolución comercial, tanto en escritores como lectores/restore. No permitir acreditar ese mismo ID como Recuperado.
3. Regularización al tercero: transferencia bancaria real de salida al participante, acreditada individualmente al caso y al tercero con sentido de devolución de aportación. No usar tipo `Devolución de gasto` ni crearla automáticamente.

`aportadoNeto(p)=cobrosAcreditados(p)−regularizacionesPagadasAcreditadas(p)` para Terceros, incluidos los inactivos con saldo pendiente. `pendienteRegularizacion(p)=aportadoNeto(p)−cuotaNeta(p)`; positivo: hay que devolver al tercero; negativo: falta cobrar. Solo Terceros en sumatorios de aportado/pendiente; excluir al Titular (`compartidos.ts:257-267`). `netoTrasParticipantes=costeEconomicoCaso−Σ aportadoNeto(terceros)` es coste bancario atribuido a las compras, no cashflow por fechas de cobro.

**Acreditación de salida:** seleccionar movimiento real existente (o registrar explícitamente transferencia real por el flujo ordinario), tercero y caso; validar origen/destino/importe/fecha, revisión del movimiento y de acreditación, evidencia, no anulado y límite disponible no ya acreditado. Una misma porción de un movimiento no se reutiliza; importe acreditado acumulado no supera movimiento ni deuda pendiente de ese tercero. La acreditación reduce aportadoNeto, no muta el cobro original. Rectificar/anular la salida o acreditación revierte solo ese efecto con auditoría y vuelve a mostrar pendiente. Preview/dirty consumen #547.

La acreditación direccional de salida es requisito funcional adicional de Compartidos para entregar #538: no se simula con un importe negativo en un contrato que solo admita cobros. Antes de DEV debe incorporarse a la SPEC propietaria14 y al contrato de persistencia de v32 de #547 si el modelo existente no la representa; si v32 ya no está disponible, se requiere migración sucesora explícita y revisión de dependencia, nunca editar una versión publicada. Sin soporte acreditado la entrega integrada queda bloqueada; no se oculta el pendiente ni se declara cerrado.

Un caso se puede liquidar cuando reparto/cobertura son verificables y todos los Terceros tienen pendiente cero, sin incidencias. Con compra120, devolución30, partes50/50 y cobro60: cuota45, pendiente15; tras salida real15 acreditada al tercero, aportadoNeto45, pendiente0 y puede cerrarse. Devolución total120: existe compra elegible con neto0, reparto válido de cuotas0; si se cobró60 hay que acreditar salida60. **Coste cero verificado no es ausencia de gastos:** se exige al menos una compra elegible y evidencia completa, no suma neta positiva (`compartidos.ts:224-234` debe adaptarse). Sin compras o cobertura insuficiente no se declara cero verificado.

No usar una identidad contable generada desde la misma fuente como prueba anti-duplicación. Reconciliar por separado ledger bancario, conjunto de devoluciones y acreditaciones de participantes, con IDs disjuntos y sumas calculadas independientemente. Inyectar una devolución en Recuperado debe producir error/incidencia, no una igualdad que siga cumpliéndose.

## 10. Matriz exhaustiva de consumidores y enmiendas propietarias

Cada fila es alcance de entrega y de prueba; referencia al predicado §3, no una nueva fórmula duplicada.

| Consumidor / propietario | Contrato corregido y reconciliación |
| --- | --- |
| Movimientos / SPEC04 | Compra bruta; devolución como hecho propio; ficha R3 derivada de R1. Sin mutación en GET. |
| Saldos y posiciones / SPEC01 | Banco real por fecha/saldo, incluye devolución una vez; ninguna magnitud presupuestaria se deriva de él. |
| Clasificación / SPEC02 | Catálogo no agrega por sí mismo; todo agregado existente o añadido sigue compra vigente, nunca copia del vínculo. |
| Plan de ciclo, presupuesto mensual / SPEC09,16 | Fuente Gasto real: GRE del intervalo/IDs de compras; detalle bruto−descuento reconciliado; desviación no DO. |
| Aportación a saldo / SPEC09,33 | Sin neteo, devolución no transferencia ni aTransferir; los lectores operativos aplican §7 aprobado (33-E1). |
| Dprima ejecución mensual / SPEC33 | executed=GRE; columna devolución por compras del ciclo, no por fecha de abono. Cobros del ciclo separados. |
| Dprima financiación G/P/sugerida / SPEC33 | `P = max(0,T−G−S)` sin redefinir `G` ni `S`; publicar `P₀` histórico y `P(t)` prospectivo acreditado por separado, y los compromisos de aportación como dato de plan, nunca como Movimiento. |
| Plan anual / SPEC10,16 | annualExecution usa compras por fecha del ejercicio natural y resta solo sus devoluciones; conserva contrato de cobertura, diferencia Presupuesto−GRE. |
| Vehículos / SPEC propietaria de Vehículos | `vehiculos.ts:90-121` llama annualExecution con subconjuntos por REF/Partida: seleccionar IDs de esas compras del año y restar solo sus vínculos. Devolución no necesita REF física. No contaminar otra REF de misma Partida; neto0 con hechos no es ausencia. |
| Flujo mensual base / SPEC12 | gasto y S conservan fórmula base bruta y unidades; cobros comerciales por fecha se muestran separados. S no se renombra DO ni saldo real completo; declarar exclusiones. |
| Flujo ajusteCompartidos / SPEC12,14 | `flujo-mensual.ts:227-260`: Recuperado sigue exclusivamente aportadoNeto de Terceros, atribuido a las compras del intervalo con reparto verificable. Incorporar salidas acreditadas en signo inverso; descuento comercial nunca entra como Recuperado. Es ajuste por atribución, no caja pura. |
| Flujo flujoAjustado / SPEC12,14 | Mantener indicador existente, no decir «ningún ajustado». Derivar por la fórmula existente S + ajusteCompartidos con signo vigente documentado por DTO; no sumar además descuento comercial porque base sigue bruta. Es flujo bruto ajustado por participantes, NO GRE. Si se añade vista económica, deriva GRE una vez en bloque distinto, no altera silenciosamente este campo. |
| Resumen anual / SPEC25 | Consume monthlyFlow y flujoAjustado (`resumen-anual.ts:280-285`): conservar bloque base bancario y bloque ajustado por participantes, con cobertura/nombres contextuales; añadir/separar bloque GRE anual por compras. No llamar al ajustado «GRE» ni restar comercial otra vez. Reconciliar intervalos de ciclos frente al ejercicio natural. |
| Inicio / SPEC24 | KPI de gasto del ciclo=GRE, saldo real aparte; cualquier disponible usa §7, no diferencia presupuestaria. |
| Comida / SPEC16 | §8; ámbito de compra, no financiación por abono. |
| Gastos compartidos / SPEC14 | §9; coste de caso neto, aportaciones/regularizaciones como fuentes separadas. |
| Informes vivos/conciliación / #547 | GRE por compra y FB por fecha separados; mismos conjuntos/cobertura; no snapshots ni segundo motor dirty. |
| Cierres E4.9, snapshots E4.11 / SPEC26–29,#547,#548 | Sustitución por #547, no reforzar fotos ni retirar físicamente antes del gate #548. |
| Histórico/precontrol / SPEC20 | Conservar hechos y declarar cobertura; no convertir transferencias ni deducir atribución de texto. |
| Backup/restore / SPEC31 | Preservar movimientos, vínculos, acreditaciones y auditoría; comprobar integridad, recomputar proyecciones y consumir política RESTAURACION de #547. |
| Presupuestos catálogo y Reparto mensual | Sin agregado de GRE nuevo; no se convierten por esta SPEC en ledger ni financiación adicional. |

Contrato exacto de Flujo (`flujo-mensual.ts:323-367,415-416`): `R_adj = Σ aportadoNeto de Terceros atribuido a las compras del intervalo`; `G_n = G_b − R_adj`; `S_aj = Ingresos − G_n − Extraordinaria = S_base + R_adj`. Se conservan las claves `rAdj`, `gNeto`, `sAjustado`; G_n/S_aj siguen siendo Parcial, no ahorro real ni flujo completo. La memoria de caja es distinta: cobros y salidas de regularización por sus fechas reales, con signo y sentido explícitos, sin sumarse otra vez a S_aj. No inferir que un cambio del neto del caso obliga a añadirlo a `ajusteCompartidos`. El descuento comercial afecta GRE, no la recuperación bancaria de terceros. El bloque ajustado puede cambiar cuando una regularización real acreditada reduce aportadoNeto; por ello se retira la promesa de que todas las cifras de Flujo/Resumen quedan intactas.

## 11. Preview, cierres y entrega segura

Todas las altas, atribuciones, rectificaciones, anulaciones y regularizaciones usan validador de dominio común en preview/escritura y envoltorio de #547. Preview devuelve compra, bruto, capacidad/descuento antes-después, GRE, DO (incluido P/sugerida cuando aplique), receptor/fecha y ciclos potencialmente afectados. Las cifras son transitorias, no snapshots persistidos. Cancelar no escribe movimiento, intento de dominio, auditoría de hecho ni dirty. La confirmación revalida huella y revisiones en la misma transacción IMMEDIATE; cambio de estado → IMPACT_CHANGED sin escritura.

Solo #547 calcula materialidad por huella antes/después de la operación con universo compatible; no confundirla con divergencia respecto a última validación. Se marca dirty únicamente donde hay efecto real; un ciclo ya dirty no se limpia por reversión ni gana evento reiterado por cambio textual sin efecto. Revisión humana limpia sin cambiar cifras. Compra A, banco B y periodos posteriores se incluyen solo si cambian sus resultados/digests, no todos por rutina. Reexpresión inicial usa el proceso de #547 y su comparación de cobertura; GET no escribe ni persiste diagnósticos. Ninguna ruta emite HISTORY_LOCKED por estar cerrado.

**Gate de exposición:** ANEXO-INTERFACES §4 íntegro: ninguna escritura nueva de devolución en ningún ciclo sin #547/#549 integradas y verificadas; rechazo servidor `503 DEVOLUTION_INTEGRATION_UNAVAILABLE`, sin fallback. Cliente y servidor aplican la misma regla.

### 11.1 Esquema y versiones

Base actual v31. La entrega integrada depende de v32 de #547: no se exige que SUPPORTED termine en31 después de integrarla. #538 no abre una versión paralela ni modifica esquema v31 en sitio. El ajuste de trigger UPDATE de compra (`comida-schema.ts:173-178`, falta `c.anulado=0`) se entrega mediante migración explícita coordinada con v32 y prueba de paridad en bases nuevas/migradas. Guardas de compra y de desanulación se prueban en todos los caminos; no se declara integridad de DB si solo se prueba el servicio.

La revisión propia ya existe y no requiere migración/backfill. No se persisten diagnósticos ni una copia de clasificación. La acreditación de salidas de Compartidos debe quedar expresamente representada y versionada si requiere persistencia nueva (§9), con contrato acordado antes de DEV. Una versión ya publicada no se reescribe. Las transiciones de movimiento y vínculo deben respetar triggers de shape; probar orden transaccional de anulación/desanulación y rollback, no suponer que un UPDATE del vínculo tras anular movimiento sea admisible.

### 11.2 Compatibilidad, migración y rollback

Entregar conjuntamente DTO de lectura, clientes Comida/Movimientos/#539, predicado y consumidores, guardas y migración coordinada. Cambios semánticos declarados: executed Dprima de bruto a GRE; Plan y Comida eliminan filtro por fecha de abono; Plan anual/Vehículos pasan a neto de sus propias compras; Resumen/Inicio separan economía de banca; financiación operativa sustituye G neto por §7. Flujo base no se convierte en GRE, y su ajuste no absorbe devoluciones comerciales.

Pruebas de contrato cubren claves existentes, ampliaciones, null/cobertura y conflicto de revisión; no confiar en marcador. Scripts/clientes externos no auditados siguen UNRUN y requieren inventario antes de exposición. Matriz mínima: código antiguo/v31 histórico; código nuevo/v32 solo con dependencias completas; cliente antiguo/escritor estricto no soportado (retirada controlada); rollback de código a versión que no entiende validaciones/acreditaciones nuevas debe fallar cerrado o deshabilitar función, no perder datos ni mostrar validación falsa.

Backup/restore en copia ficticia antes de migrar datos reales, con autorización específica para estos. Originales de auditoría conservados más un evento de restauración conforme #547, idempotente. Si integridad no pasa, aislar copia y reportar, sin degradar automáticamente para restaurar. Reexpresión de lecturas puede cambiar GRE histórico: inventario R4 y plan de impacto antes de exposición, sin ejecutar sobre datos reales ahora. #548 no borra fotos hasta sustitución validada de todos sus lectores.

## 12. Criterios de aceptación (45 identificadores estables)

Los AC son requisitos para DEV futura, **no resultados de pruebas ejecutadas**. Los AC de integración referencian contratos anteriores para evitar duplicar reglas.

- **AC-D01 — DTO y etiquetas:** recorrer consumidores de §10; cada importe tiene magnitud, unidad, periodo y cobertura inequívocos. Claves breves existentes deserializan; etiquetas contextuales distinguen GRE/FB/DO. Sin renombrado global ni marcador obligatorio.
- **AC-D02 — Proyección única:** prueba de contratos verifica que todos los consumidores de GRE y ambos resúmenes R1/R3 usan la misma proyección; ninguna copia de Partida o filtro por fecha de abono cambia el resultado.
- **AC-D03 — Reconciliación:** para mismo conjunto de compras, Plan, Dprima, Comida cuando aplique e informe #547 concilian bruto/descuento/GRE al céntimo; campos bancarios se comparan solo con su ventana real.
- **AC-D04 — Cobertura:** introducir cada causa §3.3; verificar ID/importe/causa y cobertura parcial/no disponible pertinente, sin cero completo ni contaminación de ámbitos ajenos.
- **AC-D05 — Canónico:** compra120 A/abono30 B da GRE A90, GRE B sin cambio, banco B+30, un solo Movimiento, sin Ingreso/Transferencia; DO según D28.
- **AC-D06 — Validado:** repetir D05 con A validado; preview/cancelación/confirmación y revisión humana cumplen §11 y contrato #547, sin reapertura.
- **AC-D07 — Frontera anual:** compra diciembre2026, abono enero2027; GRE natural2026 netea, natural2027 no. Repetir con ciclo financiado enero2027 cuyo Inicio cae diciembre2026: ciclo/mes financiado por maestro y anual por fecha, reconciliación explícita sin suma automática de ciclos.
- **AC-D08 — Parciales:** compra120 con abonos30 y40 Verificados/Acreditados: capacidad50, descuento70, GRE50; items íntegros y resumen independiente de paginación.
- **AC-D09 — Total:** compra121,45 y devolución total: GRE0 y capacidad0, un banco+121,45; cero verificable con compra real, no ausencia.
- **AC-D10 — Exceso:** D08 más abono51 se bloquea en formulario para esa compra con M-1 y servidor DEVOLUTION_EXCESS; no bypass Revisar ni escritura parcial. Concurrencia conforme D41.
- **AC-D11 — Anulación devolución:** anular/desanular repite §6; banco, descuento y capacidad se retiran/restauran una vez; desanular sin capacidad o compra válida se rechaza con rollback y auditoría coherente.
- **AC-D12 — Compra incompatible:** anular/retipificar/eliminar con devolución vigente da DEVOLUTION_LINKED sin degradación. Tras anular devoluciones, puede anularse compra; FK impide borrado físico. Aplicar literal §6.
- **AC-D13 — Reducción y Revisar:** compra120/devuelto70: reducir a69 rechaza; reducir a80 conserva Verificados y capacidad10. Degradación explícita individual solo según §6; no elimina el bloqueo de anular mientras vínculo vigente persiste.
- **AC-D14 — Corrección y restauración:** cambiar tipo de devolución atribuida rechaza; aumento fuera de capacidad rechaza, sin degradar; históricos inconsistentes se diagnostican sin writes. Restauración/desanulación pasan mismas guardas (§6,11). Reatribución individual ofrecida por #539 según anexo §6, sin movimiento nuevo.
- **AC-D15 — Otro receptor:** repetir D05 a otro saldo y otro ejercicio: fecha/saldo reales, sin transferencia añadida; verificar DO por D28, no por etiqueta.
- **AC-D16 — Alta:** POST movimientos con bloque devolución desde compra crea movimiento+vínculo atómicos. Sin compra rechaza; POST comida/{devolucionId}/devolucion solo atribuye hecho existente sin banco nuevo; legacy de alta se rechaza.
- **AC-D17 — Sin copias:** alta deja NULL la Partida opcional del vínculo y del movimiento técnico, sin copiar clasificación de compra; informes derivan Concepto/Categoría/Partida/REF vigente. No REF nueva ni referencia física en devolución. Partida opcional NULL y partidaResuelta derivada (anexo §5).
- **AC-D18 — Reatribución:** cambiar Partida/Concepto/REF y fecha de compra con devoluciones mueve bruto y descuento al mismo ámbito; copia legacy contradictoria no prevalece. En dos REF con misma Partida, no queda descuento en la anterior.
- **AC-D19 — Huérfanos:** fila histórica Acreditada sin compra se lee/marca y no netea en ningún consumidor; saneamiento individual con evidencia/revisiones/tope la hace elegible, sin crear nuevo banco ni conversión masiva.
- **AC-D20 — Comida tardía:** aplicar D05 a compra Comida; neto A90, B sin recursos/financiación nueva y OTRO_CICLO solo informativo; §8.
- **AC-D21 — Comida ajena:** abono de compra ajena y huérfano de ámbito desconocido no degradan Comida; integridad global los presenta según §3.
- **AC-D22 — Sin clasificación:** compra Comida demostrada sin dimensión requerida genera sinClasificacion y cobertura parcial, no sinAcreditacion ni cero completo.
- **AC-D23 — Recursos:** los recursos/financiación Comida y conteo de movimientos cumplen D20/D05; incluir rectificación/anulación sin duplicados.
- **AC-D24 — Compartido parcial:** compra120, partes50/50, devolución30 y cobro60: coste90, cuotas45, pendiente tercero15; sin transferencia automática. Tras transferencia real15 acreditada al tercero, aportadoNeto45, pendiente0, cierre posible con cobertura verificable.
- **AC-D25 — Antidoble descuento:** construir conjuntos independientes por IDs/tipos de ledger, devoluciones y acreditaciones. ID de devolución inyectado como Recuperado o como regularización es rechazado/incidencia y nunca reduce dos veces. Sumatorios excluyen Titular; conciliar ledger por fechas y coste por compras, no validar solo una identidad de fuentes compartidas.
- **AC-D26 — Compartido total:** caso cerrado que recibe devolución total se recalcula a coste0 verificable con compras; cobro60 permanece, salida real60 acreditada cierra. Sin gastos no es cero verificado; anular salida reabre pendiente60, no cobro original ni hecho ficticio.
- **AC-D27 — Plan:** GRE y detalle por §10; Aportación a saldo/aTransferir no consumen devolución. Cobertura usa D04, no fórmula paralela.
- **AC-D28 — Dprima y DO (SPEC33-E1):** con `T`, `N`, compras y otros hechos fijos, comparar antes/después una devolución de 30 al saldo financiador y a otro saldo, dentro y fuera de corte, con el ciclo de compra validado y en ejercicio anterior. `P₀` y la fotografía de apertura **no cambian** en ningún caso; `P(t)`, recalculado a corte acreditado, refleja solo hechos reales. Un compromiso de aportación reduce `pendienteDeDecidir(t)` **sin** alterar `P`, `S` ni crear Movimiento; al ejecutarse la transferencia, `S(t)` sube, `P(t)` se recalcula, el compromiso pasa a `Ejecutada` y el derivado **no salta**. Probar sobrecompromiso señalado y con revisión exigida, asignaciones parciales y anulación por importe, y valores no saturados de `P` para que `max(0)` no oculte un error. Repetir con devolución No acreditada, anulación, corrección de saldo y fuente no verificable (`P(t)` No disponible).
- **AC-D29 — Anual y Vehículos:** annualExecution netea solo IDs de compras suministrados. Dos vehículos/REF misma Partida, devoluciones en otro año: solo vehículo y año de compra cambian; total0 con hechos no se confunde con ausencia, cobertura anual conservada.
- **AC-D30 — Resumen anual:** bloques GRE natural, FB base y flujoAjustado cumplen §10 y reconcilian con sus fuentes; no suma mixta ni descuento comercial repetido. Incluir frontera D07 y regularización real D24.
- **AC-D31 — Inicio:** KPI ciclo=GRE, posiciones bancarias reales y disponible separados; D28 demuestra ausencia de financiación automática por devolución.
- **AC-D32 — Flujo:** base gasto/S mantiene fórmula bruta; cobros comerciales por fecha aparte. ajusteCompartidos y flujoAjustado conservan fórmula y signo documentados, excluyen IDs comerciales, incluyen salida acreditada inversa; son ajuste por participantes, no GRE ni caja pura. Consumidor Resumen coincide (D30).
- **AC-D33 — R1/R3:** misma proyección produce resúmenes idénticos, capacidad y descuento separados, totales completos con varias páginas; GET no cambia filas/revisiones/dirty. Shapes exactos del anexo §2: sin alias de capacidad; R5 con importeMin/importeMax y posiciones bancarias del servidor.
- **AC-D34 — Banco:** posiciones por fecha real concilian con ledger para alta/rectificación/anulación y otro receptor; no se desplaza dinero al ciclo de compra.
- **AC-D35 — Preview:** matriz de errores de §§5–6 da mismos códigos en preview/escritura; cancelación no persiste hechos/diagnósticos/dirty. Auditoría de cierre no almacena cifras del preview. Incluye atribuir y reatribuir, banco invariante y GRE origen/destino; signoGasto admite invariante.
- **AC-D36 — Impacto:** preview incluye capacidad/descuento/GRE/DO/banco antes-después; confirmar huella obsoleta da IMPACT_CHANGED y rollback. Afectados solo por materialidad #547; no dirty reiterado por edición textual ni limpieza por reversión. Precedencia del anexo §1; IMPACT_CHANGED también al atribuir y reatribuir.
- **AC-D37 — Revisión cliente:** dos atribuciones concurrentes: segunda conflicto de devolución. Falta contador rechaza; Comida.tsx y #539 envían ambas revisiones correctas tras recarga. Filas existentes funcionan sin backfill; cliente antiguo no se expone con servidor nuevo.
- **AC-D38 — Idempotencia/duplicado:** aplicar §5.4 a alta y rectificación; misma clave/payload una escritura; payload distinto conflicto; coincidencia aceptada deja rastro duradero y no excede capacidad.
- **AC-D39 — Sin acreditar:** Verificado No acreditada30 sobre120 publica capacidad90, descuento0 y GRE120 en R1/R3; otro abono91 rechaza. Acreditar el30 da descuento30, capacidad90. R4 solo integridad y lectura sin efecto.
- **AC-D40 — Compatibilidad:** fixtures reales de DTO antiguo y ampliado pasan adaptadores/clientes coordinados; claves breves no desaparecen por estilo, se documenta cambio semántico. Dependencias #547/#549 ausentes deshabilitan nueva escritura con explicación, no guardan sin aviso.
- **AC-D41 — Integridad concurrente:** dos conexiones/escritores que exceden capacidad: uno gana, otro error/409, suma Verificado nunca supera compra. Cubrir cambios importe/compra/estado/anulado, guardas y triggers, rollback íntegro; no basta test de INSERT.
- **AC-D42 — Restore:** conservar hechos, vínculos, evidencias, revisiones y auditoría original más evento restauración #547; proyecciones concilian, política dirty y aislamiento de inconsistentes se comprueban. Repetición idempotente sin evento duplicado.
- **AC-D43 — Versiones:** probar v31→v32 coordinado, base nueva equivalente, trigger UPDATE exige compra vigente y guardas de transición no se eluden; no afirmar SUPPORTED termina31. Acreditación de salidas tiene contrato/migración explícito antes de entrega; rollback conforme §11, full en verde antes de DEV concluida.
- **AC-D44 — Reexpresión:** vínculo con ciclo/Partida almacenados antiguos netea compra vigente; diagnósticos derivados R4 sin persistencia/backfill. Proceso #547 de transición marca revisión pendiente según impacto/cobertura, nunca GET. Huérfano sigue D19.
- **AC-D45 — Cierres:** ninguna operación usa HISTORY_LOCKED por cierre, dirty informativo solo lo limpia revisión humana y no reversión; #549 cita §6 literalmente y #548 no retira fuentes antes de sustitución aceptada. Limpieza/reversión de #547 según mapeo final y anexo §3.

## 13. Plan de verificación, riesgos y pendientes

Bun1.4.3, SQLite ficticia en memoria/archivo aislado, sin datos reales ni puertos3001/5173. Verificación canónica futura: `python3 scripts/verify --full`; QA independiente. Cada AC se traza a test por ID, sin declarar ejecución por estar redactado.

| Suite prevista | Cobertura |
| --- | --- |
| devoluciones-consumidores / comida / movimientos | D01–23, D33–39, D44: predicado, rutas, revisión, preview y clasificación |
| planes-ciclo / dprima | D27–28, D05/D15 referenciados: ejecución y DO no saturada, receptor y corte |
| plan-anual / vehiculos / resumen-anual / resumen-inicio / flujo-mensual | D07,D29–32: filtros por IDs, periodos naturales/financiados y ajustes existentes |
| compartidos | D24–26, D25 negativo por ID/tipo, regularización y cero con hechos |
| migración / backup / restore / concurrencia | D41–45, triggers y rollback; dos conexiones con busy_timeout |
| cliente Comida / Movimientos / integración #539/#549 | D16,D37,D40; carga, vacío, error reintentable, conflicto y dependencias ausentes |
| E2E aislado | Gasto→devolución→preview→confirmar→navegación y consumidores, parcial/total/otro ciclo |

Estados UI: carga sin formulario confirmable; vacío sin devolución distingue ausencia de cobertura; error muestra causa y reintento; conflicto conserva borrador y obliga recargar impacto/revisiones; cancelar no escribe; confirmación solo tras aviso requerido. Mantener accesibilidad/teclado y tokens existentes; el diseño detallado pertenece a #539/#549.

Riesgos principales: acoplar DO al GRE (§7); descontar por Partida global en subconjuntos (§10); confundir acreditación económica con capacidad (§4); cierre de coste cero no regularizado (§9); desplegar revisión estricta sin Comida (§5.3); migración de triggers/regularizaciones fuera de versión (§11). Mitigación: AC negativos y gate integrado, no etiquetas ni marcador decorativo.

Pendientes de entrega: **SPEC14-E1 aprobada el 2026-11-23 (requisito previo cumplido); pendientes su DEV e integración** y, de forma independiente, la **autorización expresa de DEV** de #538 (la aprobación de esta SPEC ya se concedió el 2026-11-22); revisión cruzada #539/#549 y actualización propietarias SPEC09/10/12/14/16/24/25/33/Vehículos; concretar soporte versionado de acreditaciones de salida antes de implementar; contrato y DEV #547/#549 antes de exposición. `UNRUN`: tests de implementación, dry-run/savepoint real, rendimiento >12meses, clientes externos, datos reales, impacto cuantitativo del saneamiento. Project4 no verificable por cuota GraphQL; no se presenta como cambio de fase ni bloqueo de este borrador.

## 14. Respuesta a la revisión

| Hallazgo | Corrección normativa y comprobación |
| --- | --- |
| 1. Copia de Partida prevalece y AC obliga copiar | §3 deriva solo compra vigente, elimina copia en alta; D17/D18 y pruebas por REF D29. #539 U10 debe referenciar este contrato. |
| 2. Huérfanos netean y no netean | Política única §3.2: leen, marcan, no netean aun Acreditada; D19/D44. |
| 3. Degradar frente a rechazar | Literal único §6 para #539/#549: rechazo incompatibles, reducción válida conserva, Revisar solo explícito; código actual citado; D12–14. |
| 4. Sin acreditar y tope | §4 y R1/R3 separan capacidadBancariaRestante de descuentoEconomico; trigger incluye todo Verificado; D39. U09 no promete pendiente invariable. |
| 5. Identidad no detecta doble descuento | §9 exige fuentes/IDs/tipos disjuntos, titular excluido y reconciliación independiente; D25 prueba inyección contaminada. |
| 6. Regularización y cero | §9 define salida bancaria real acreditada al tercero, efecto inverso/reversión, cierre y dependencia de persistencia; cero con compras distinto de ausencia; D24/D26. |
| 7. DO no demostrada | §7 sustituido por el contrato aprobado de 33-E1: `P₀` inmutable, `P(t)` prospectivo acreditado y compromisos separados de Movimientos; D28 prueba ambos receptores/cortes, no saturado, sobrecompromiso y arrastres. |
| 8. Matriz incompleta | §10 incluye Vehículos/annualExecution por IDs/REF, ajusteCompartidos/flujoAjustado y consumo anual; D29/D30/D32. |
| 9. devolucionRevision rompe Comida | §5.3 hace actualización cliente/API una dependencia obligatoria; columnas ya existen, sin backfill; D37/D40. |
| 10. Compatibilidad/marcador/v31-v32 | §2.3 y §11 eliminan marcador obligatorio y veto a nombres breves, declaran ampliaciones y cambios semánticos con pruebas; D01/D40/D43 exigen entrega coordinada v32, no techo31. |
| Complejidad sobrante | Una proyección R1/R3 (§5.2), R4 inventario no selector, diagnósticos solo derivados, AC de integración por referencia. |
| Exceso en formulario y promesa universal | §4 conserva bloqueo solo para la compra seleccionada y texto M-1 sin garantía de resolver cualquier abono; D10. |
| Ruta de alta mal descrita en propuesta | §5.1 reutiliza POST movimientos atómico; POST comida por ID de devolución solo atribuye; D16. |
| Frontera financiada/natural y exposición | §2.2/D07 definen ventanas distintas; §11/D40 bloquean exposición sin #547/#549. |

**Resultado de esta entrega:** especificación corregida, no implementación ni aprobación. Ningún cambio en repositorio, GitHub, base de datos o Excel.

## Reconciliación de interfaces

D14/D17/D33/D35/D36/D45: Partida NULL/derivada, shapes publicados, atribuir/reatribuir con preview, gate único y errores; §§1–6 del anexo.

Fuente compartida: [anexo de interfaces de SPEC38](38-e49b-cierre-validacion-interfaces.md). Cambios limitados a los trece hallazgos y referencias afectadas; no modifica decisiones ajenas, no publica ni autoriza ejecución. Todos los AC permanecen UNRUN.

# Procedencia y trazabilidad

- **Texto normativo §1–§14:** comentario `7024602562` de #538, sin reescritura salvo las correcciones de coherencia documental de §7, §10, `AC-D28` y §14, que adaptan el documento al contrato ya aprobado.
- **§7 vigente:** [enmienda 33-E1](33-dprima-simplificada-enmienda-01.md) en `test`. La política anterior de `R_saldo`/`S_operativo` quedó descartada el 2026-11-22 y solo vive como historia en el comentario original.
- **Interfaces:** [anexo de interfaces de SPEC38](38-e49b-cierre-validacion-interfaces.md) y la SPEC propietaria #538.
- **§9/§11:** la acreditación de salida a terceros exige contrato propietario en **SPEC14**, persistencia con migración versionada propia y reconciliación entre lo recuperado y lo regularizado. SPEC14-E1 está **aprobada (2026-11-23)**; **sin su DEV e integración verificada no hay activación integral**, y `AC-D25` queda condicionado por dependencia.

## Estado

**SPEC aprobada el 2026-11-22. Los 45 AC (`AC-D01`…`AC-D45`) permanecen `UNRUN`.** La aprobación es del contrato, no de su ejecución.

**No autoriza DEV, migraciones, cambios de datos ni despliegue.** La aprobación de SPEC14-E1 ya está cumplida (2026-11-23); su DEV e integración y la autorización expresa de DEV de #538 son decisiones independientes y siguen pendientes.
