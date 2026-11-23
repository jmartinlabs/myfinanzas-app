# 38 — Anexo de interfaces compartidas del rediseño de cierre y devoluciones

Status: **APROBADA — 2026-11-20**, junto con la SPEC38 v7, como contrato normativo de
interfaces. **NO AUTORIZA DESARROLLO, API, SQLITE, MIGRACIÓN NI BORRADO.**
Approval source/date: **2026-11-20 — usuario**,
[aprobación formal de SPEC38 v7 y su anexo](https://github.com/jmartinlabs/myfinanzas-app/issues/547#issuecomment-7037286690).

Fuente única de los contratos que comparten la
[SPEC38](38-e49b-cierre-validacion-specification.md) y las specs de devoluciones que se
deriven de las Issues [#538](https://github.com/jmartinlabs/myfinanzas-app/issues/538),
[#539](https://github.com/jmartinlabs/myfinanzas-app/issues/539) y
[#549](https://github.com/jmartinlabs/myfinanzas-app/issues/549). Fija códigos de error con su
precedencia, shapes de lectura, proyección de estado, gate de exposición, Partida del vínculo
y vía de reatribución.

Nació de una pasada de reconciliación única, tras detectar que corregir cuatro specs
interdependientes en paralelo había derivado sus interfaces: el mismo hecho con dos códigos
distintos, un campo con dos nombres y un gate descrito de dos maneras. **Ninguna spec
consumidora redefine lo que aquí se fija**; si diverge, se corrige la consumidora.

Base documental: `test` `7a996b29`. Documento normativo sin código: no declara ninguna prueba
ejecutada y todos sus criterios quedan **UNRUN** hasta que exista implementación.

---

Contrato único de esta reconciliación local, **aprobado el 2026-11-20** (véase la cabecera): no autoriza DEV, publicación, datos reales ni despliegue. Las reglas de dominio no afectadas permanecen en su SPEC propietaria.

## 1. Errores y precedencia

| Código canónico | HTTP | Cuándo |
| --- | --- | --- |
| DEVOLUTION_INTEGRATION_UNAVAILABLE | 503 | Falta contrato/esquema #547, aviso #549 o integración verificable para escribir devoluciones; también fuente imprescindible de impacto no disponible. Nunca estado SinValidar por fallo. |
| IDEMPOTENCY_CONFLICT | 409 | Clave ya usada con hash de payload distinto. |
| VALIDATION | 422 | Payload inválido, revisión requerida ausente, clasificación contradictoria, compra no elegible o evidencia requerida ausente. |
| NOT_FOUND | 404 | Identidad solicitada inexistente. |
| REVISION_CONFLICT | 409 | Revisión del movimiento obsoleta. |
| ATTRIBUTION_REVISION_CONFLICT | 409 | Revisión propia del vínculo obsoleta. |
| IMPACT_CHANGED | 409 | Cambió contexto, conjunto, clasificación, validación, huella o impacto mostrado desde preview; sin otra revisión específica obsoleta. Conserva borrador y exige nuevo preview. |
| DEVOLUTION_LINK_REQUIRED | 422 | Alta sin compra. |
| DEVOLUTION_LEGACY_WRITE | 422 | Escritura legacy de revisión-comida como devolución. |
| DEVOLUTION_ORIGIN_MISMATCH | 422 | Ciclo enviado contradice el derivado. |
| DEVOLUTION_LINKED | 422 | Anular/eliminar/retipificar compra con devolución vigente vinculada. |
| ATTRIBUTION_EXISTS | 422 | Retipificar/eliminar devolución atribuida. |
| PURCHASE_BELOW_REFUNDED | 422 | Reducir compra por debajo del acumulado Verificado vigente. |
| DEVOLUTION_EXCESS | 422 | Nueva verificación/importe/reatribución excede capacidad de compra destino. |
| DUPLICATE_REVIEW | 409 | Coincidencia pendiente de aceptación explícita y evidencia; nunca permite exceder tope. |

Orden: autenticación/MFA/CSRF existentes primero (sin cambiar sus códigos); después, clave completada: mismo hash reproduce recibo sin revalidar contexto ni gate, distinto hash IDEMPOTENCY_CONFLICT. Intento nuevo: gate 503; estructura y existencia; REVISION_CONFLICT; ATTRIBUTION_REVISION_CONFLICT; IMPACT_CHANGED; guardas de dominio en orden de la tabla; coincidencia. Dentro de estructura: VALIDATION de formato antes de existencia; falta compra en alta usa DEVOLUTION_LINK_REQUIRED. Ante cambio de contexto y error económico surgido después del preview, prevalece IMPACT_CHANGED y se vuelve a previsualizar; un preview nuevo publica el error de dominio. Nunca escrituras parciales. No hay alias del código de impacto. HISTORY_LOCKED no es respuesta por cierre en este flujo; códigos ajenos de integridad y rutas retiradas conservan su contrato propietario.

## 2. Shapes únicos de lectura y preview

Los nombres siguientes son normativos, no requisitos pendientes. Importes usan la representación monetaria exacta del API existente, nunca floats nuevos; null indica NoDisponible y nunca cero. IDs/fechas/revisiones conservan formatos de dominio. No persistir estos resultados como fotos.

```text
R1 = {
 compra:{id,fecha,importe,partida,referencia,cicloAtribucion},
 resumen:{count,bruto,devueltoVerificado,capacidadBancariaRestante,
          descuentoEconomico,gastoRealEconomico,pendienteRevision,cobertura,causas,ids},
 items:[{id,fecha,importe,saldoReceptor,estado,elegibilidad,revision,
         devolucionRevision,cicloDerivado,cicloAlmacenado,diagnosticos,evidencias}],page,total
}
R3.devolucionesResumen = R1.resumen
```

Se elige campo único `resumen.capacidadBancariaRestante`; no alias `restante` ni objeto `totales`. Evita que una compatibilidad ambigua se convierta en segunda semántica de GRE. `restanteAntes/restanteDespues` son exclusivamente capacidad bancaria del preview, no un alias de R1. Revisar no consume/reserva capacidad; Verificado sí, incluida No acreditada. `pendienteRevision` es informativo; con cero revisión tampoco se presume igualdad de capacidad y GRE.

```text
preview = {fingerprint,contextRevision,impactRevision,devolucionImpacto}
devolucionImpacto = {
 compra,compraFecha,cicloAtribucion,anioAtribucion,bruto,
 devueltoAntes,devueltoDespues,restanteAntes,restanteDespues,estadoResultante,
 partidaResuelta,
 receptor:{saldo,nombre,fecha,saldoAntes,saldoDespues},
 magnitudes:{gastoRealEconomicoAntes,gastoRealEconomicoDespues,
             descuentoEconomicoAntes,descuentoEconomicoDespues,
             disponibleOperativoAntes,disponibleOperativoDespues,
             aportacionSugeridaAntes,aportacionSugeridaDespues,
             flujoBancarioImporte,flujoBancarioFecha},
 ciclosAfectados:[{ciclo,rango,motivo,material,estadoValidacion,validado,dirtyPrevio,
                   signoGasto,cifrasAntes,cifrasDespues}]
}
confirmacion = {operacionId,ciclos:[{id,revision,estado}],auditIds,
               cierresDirty:[{ciclo,rango,estadoValidacion,validado,dirtyPrevio}]}
R5 = GET /api/comida?tipo=Gasto&estado=Vigente&desde=&hasta=&importeMin=&importeMax=&page=
R5.respuesta = {items:[{id,fecha,importe,concepto,partida,saldo}],page,total}
```

`devueltoAntes/devueltoDespues` son acumulado Verificado de la compra seleccionada; sustituyen los otros nombres de acumulado del preview, no `R1.resumen.devueltoVerificado`. En reatribución la compra seleccionada es destino y `ciclosAfectados` incluye origen y destino medidos; no se infiere el delta de cada ciclo del acumulado destino. `partidaResuelta` es ID de la Partida de compra vigente o null con cobertura no disponible; no se inventa fallback. `cifrasAntes/cifrasDespues` son las magnitudes del universo #547 §3.1 por ciclo, con claves GRE de #538; null/cobertura conservan significado, sin cómputo cliente.
`receptor.saldoAntes/saldoDespues` son posiciones bancarias en el mismo corte de `fecha`, antes/después del procedimiento; no simples deltas. `flujoBancarioImporte` es delta bancario firmado de la operación en `flujoBancarioFecha` real; cero al atribuir/reatribuir sin alterar hecho bancario. `descuentoEconomicoAntes/Despues` es la minoración acumulada que la operación aplica al gasto real del ciclo de compra y `aportacionSugeridaAntes/Despues` la `P` de Dprima cuando la vista la publica; ambas son `null` cuando no aplique, nunca `0` por defecto. `rango` es `{desde,hasta}` del ciclo tomado del maestro de ciclos en la misma transacción: acompaña a `ciclos` y `cierresDirty` para que el texto nombre ciclo y fechas sin consulta adicional ni cálculo en cliente. Rectificación que cambia fecha o cuenta conserva en el preview genérico los dos efectos fechados, no los colapsa en un único delta engañoso. `signoGasto = baja | sube | invariante` lo calcula servidor por ciclo, aunque material sea true solo por banco/stock. `ciclosAfectados` es completo, no paginado. `cierresDirty` se devuelve después de confirmar, desde estado real; no se deriva de impacto ni se persisten cifras en recibo.
R5 aplica filtros inclusivos por fecha e importe bruto de compra, importeMin <= importeMax, ambos monetarios exactos no negativos; filtro inválido 422 VALIDATION. Misma paginación/orden estable de listComida, total del conjunto filtrado, solo Gasto vigente elegible no Terminal. No limita al ciclo vigente ni propone un vínculo; ampliar rangos requiere acción humana y nunca lista sin acotación temporal. La UI no pide ID manual.

## 3. Estados y proyección humana

`estadoValidacion = SinValidar | Validada | Pendiente`, exclusivamente #547. Sin fila después de lectura válida: SinValidar. Fila dirty=0 con referencia humana vigente: Validada. Fila dirty=1: Pendiente, incluso migrada sin revisión humana.
`validado` significa existe referencia humana comparable del nuevo conjunto, no «existe fila» ni «es Pendiente»; true si huella_validacion no null y version_conjunto comparable con metadatos humanos completos. `dirtyPrevio` significa estado previo Pendiente y es independiente de validado. Pendiente migrado: estadoValidacion=Pendiente, validado=false, dirtyPrevio=true; jamás «ya validaste». Referencia humana no comparable tampoco autoriza esa frase. La limpieza solo por revisión humana; reversión no limpia.
#549 elige primero Pendiente → titular «Este ciclo ya está pendiente de revisión.» y F-4b, sin atribuir la marca al nuevo cambio; después Validada con validado=true → F-1/F-8 y F-4; SinValidar → F-7/F-8N sin prometer marca. En mixtos titular neutro y consecuencia por entrada. Un Pendiente no comparable no se convierte en SinValidar. Resultado M-13b para dirtyPrevio=true, incluido migrado. M-13 solo si se marcó nuevo Pendiente.

## 4. Gate único de exposición

No se expone ninguna escritura nueva de devolución (alta, atribución, reatribución, rectificación, anulación/restauración) sin #547 y #549 integradas y verificadas con #538/#539, en ningún ciclo, vigente o terminado. Lecturas siguen disponibles. Cliente deshabilita y protege ruta; servidor rechaza intento nuevo con 503 DEVOLUTION_INTEGRATION_UNAVAILABLE. No bypass ni aviso sustitutorio. Texto G-1: «Las operaciones de devolución no están disponibles hasta que el aviso de impacto y la confirmación estén integrados. Las devoluciones existentes se pueden consultar.»
Con dependencias disponibles siempre hay preview y confirmación explícita del mismo fingerprint; #549 renderiza aviso cuando existe impacto material, incluso bancario con gasto invariante y sin validación previa. Lista material vacía no genera bloque vacío, pero no elimina confirmación. No depende de que el ciclo haya terminado.

## 5. Partida del vínculo

Derivada de compra vigente para toda lectura. Alta/reatribución no copian Partida al vínculo ni al movimiento: columnas opcionales quedan NULL; datos históricos copiados permanecen pero se ignoran. Cambio de Partida de compra no reescribe vínculo ni incrementa su revisión; publica partidaResuelta derivada. Esta regla corrige D17 de #538 y conserva U10 de #539.

## 6. Atribuir y reatribuir

#539 ofrece «Atribuir a un gasto» en devolución histórica sin vínculo y «Cambiar gasto de origen» en ficha de devolución ya vinculada vigente. R4 solo inventario, con enlace a la ficha, no escritor. Ambas usan R5 y POST /api/comida/{devolucionId}/devolucion: mismo movimiento, sin abono nuevo. Reatribución exige compra anterior esperada, compra destino distinta elegible, revision y devolucionRevision actuales, evidenciaRelacion y motivo obligatorio. Si no existe fila de atribución, lectura suministra devolucionRevision=null como ausencia explícita; creación comprueba esa ausencia atómicamente; si existe, revisión real obligatoria, nunca contador inventado.
Preview común #547 de esa misma operación muestra efecto económico origen/destino y banco invariable; confirmar con fingerprint/contextRevision/impactRevision e idempotencia revalida todo, tope destino excluyendo el propio vínculo al actualizar, auditoría individual y marcas por impacto. Nunca desvinculación huérfana intermedia ni degradación automática. Atribuir puede cambiar GRE sin cambiar importe/banco: IMPACT_CHANGED también aplica. Nueva relación/evidencia solo por usuario; origen se conserva en auditoría, no como segundo vínculo vigente.
