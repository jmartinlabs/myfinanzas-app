# 38 — E4.9b: cierre de validación operativa con recálculo vivo — Specification

Status: **APROBADA — 2026-11-20.** SPEC38 v7 con sus 57 AC y su anexo de interfaces
aprobados como contrato funcional y técnico. **NO AUTORIZA DESARROLLO, API, SQLITE, MIGRACIÓN
NI BORRADO**, y los 57 AC siguen **UNRUN**: aprobar la especificación no acredita ninguna
prueba ejecutada, ninguna implantación ni la aceptación funcional de la aplicación.

Approval source/date: **2026-11-20 — usuario**, decisión expresa registrada en
[aprobación formal de SPEC38 v7 y su anexo](https://github.com/jmartinlabs/myfinanzas-app/issues/547#issuecomment-7037286690).
Los dos actos que la SPEC exigía están cumplidos y son independientes entre sí:

1. **Registro formal de la sustitución** de SPEC26 AC-08/AC-14/AC-16, SPEC27
   AC-01/AC-03/AC-04/AC-08/AC-09/AC-13/AC-14, SPEC28 completa y SPEC29 E4.11-AC01…AC05
   (§8 de este documento): [registro de sustitución](https://github.com/jmartinlabs/myfinanzas-app/issues/547#issuecomment-7037207679), 2026-11-20.
2. **Aprobación explícita de esta SPEC** con fecha e identificador:
   [aprobación formal de SPEC38 v7 y su anexo](https://github.com/jmartinlabs/myfinanzas-app/issues/547#issuecomment-7037286690),
   2026-11-20.

Ninguno de los dos autoriza DEV, migración, cambio de esquema ni borrado: cada uno conserva su
gate propio en [approvals](methodology/approvals.md). El registro de sustitución no elimina
datos históricos ni retira reglas fuera de la matriz de §8.

Materialización documental: `specs/38-e49b-cierre-validacion-specification.md` y
`specs/38-e49b-cierre-validacion-interfaces.md`, fusionados en `test` por el merge `7a996b29`
de la [PR #551](https://github.com/jmartinlabs/myfinanzas-app/pull/551) (candidato aprobado
`69030195`).

Issue: [#547](https://github.com/jmartinlabs/myfinanzas-app/issues/547).
Contrato compartido de interfaces:
[SPEC38 · anexo de interfaces](38-e49b-cierre-validacion-interfaces.md), aprobado el 2026-11-20
junto con esta SPEC y normativo para sus consumidoras.
Consumidores directos: [#548](https://github.com/jmartinlabs/myfinanzas-app/issues/548)
(retirada de fotografías, después de que esta SPEC esté implantada y aceptada),
[#538](https://github.com/jmartinlabs/myfinanzas-app/issues/538) (gasto neto al ciclo de la
compra) y [#539](https://github.com/jmartinlabs/myfinanzas-app/issues/539) /
[#549](https://github.com/jmartinlabs/myfinanzas-app/issues/549) (devoluciones).
Base documental: `test` `7a996b29`; redacción exclusivamente documental, sin código.
Specs base afectadas: SPEC04, SPEC13, SPEC21, SPEC26, SPEC27, SPEC28, SPEC29 y SPEC30.

Las marcas `[CONFIRMADO]`, `[PROPUESTA]` y `[PENDIENTE]` distinguen contratos decididos,
diseño propuesto y cuestiones sin decisión. **Esta SPEC aprobada no conserva ninguna marca
`[PROPUESTA]` en su contrato**: si alguna apareciera en una cita o referencia externa, no
estaría aprobada. Ninguna marca convierte una propuesta en autorización. Este documento no
declara ninguna prueba ejecutada: **todos sus AC están en UNRUN**.

---

**Contrato compartido normativo:** [anexo de interfaces](38-e49b-cierre-validacion-interfaces.md), §§1–6; fuente única de códigos, shapes, estado proyectado, gate, Partida y reatribución. Esta reconciliación no autoriza DEV ni declara AC ejecutados.

**Estado:** aprobado el 2026-11-20 (ver cabecera); sin autorización de DEV.
**Entrega:** exclusivamente local; no publicar, no modificar el repositorio ni datos reales.
**Base inspeccionada:** `test` @ `e7a9f7fd50edeefe8f2ff27654ffdb758395416b`; esquema existente v31.
**Sustituye:** SPEC del comentario `7023426072`, no su histórico ni las decisiones del usuario.
**Fuentes leídas:** cuerpo #547, SPEC completa anterior, revisión independiente `7023812865`, SPEC #538 `7023047021` y su revisión `7023813576`.
Los índices relativos de comentarios indicados en el encargo ya no apuntan a todos esos textos: se identificaron por contenido e ID.
**Normativa:** decisiones del cuerpo y las doce correcciones del encargo prevalecen; todos los AC de esta versión están UNRUN.
**Fuente única:** #547 define validación, impacto, revisión pendiente y envoltorio transaccional; #538 define devoluciones; #539 su UX; #548 la retirada física.
#538 está corrigiendo su matriz en paralelo: se referencia su contrato económico, no recuentos de consumidores ni cifras cambiantes.

## 1. Objetivo, límites y matriz de garantías

Cerrar significa haber revisado, no congelar resultados. Todo informe calcula hechos vigentes y relaciones actuales.
No se crea un segundo ledger, maestro de ciclos ni archivo de resultados históricos. El Excel sigue siendo fuente de verdad hasta el traspaso autorizado.
Las correcciones de Inicio/S0 y hechos históricos se permiten con integridad, preview, motivo y auditoría; no necesitan reapertura.
La siguiente matriz concentra prohibiciones, gates y controles comunes. Cada AC que la referencia hereda sus garantías, sin multiplicar AC negativos equivalentes.

| Garantía | Contrato normativo | Verificación exigida / incremento |
| --- | --- | --- |
| G1 · Fuente única | `ciclos` y hechos vigentes alimentan informes; `cierre_validacion` decide estado. Ninguna lectura financiera depende de E4.9–E4.11 | Grafo de imports y SQL, fixture con fotos deliberadamente distintas; I2 |
| G2 · Pendiente no bloqueante | `dirty` no impide alta, rectificación, anulación, plan ni informes; solo revisión humana limpia | Matriz de rutas y escritores, reversión y no-op; I2 |
| G3 · Sin fotografía nueva | DTO estricto de §2; ni preview, importes, desgloses ni series en auditoría/intent/log/export de validación | Validación runtime y DB, inventario exhaustivo de escritores, pruebas adversariales; I1/I2 |
| G4 · Integridad y fallo cerrado | Esquema desconocido/incompleto no muta; estado ausente por fallo nunca equivale a Sin validar; se conservan guardas reales | Retirar tabla en copia: 503; contratos exactos de esquema y FK; I1/I2 |
| G5 · Seguridad operativa | Backup restaurable + recuperación ejecutada son gate para migración/escrituras/despliegue con datos reales, no aviso ni requisito financiero de validar | Manifiesto/checksum, restore aislado, integridad y conteos reconciliados; I1/I3 |
| G6 · Fases y limpieza | #547 no borra fotos ni datos, #548 solo tras aceptación funcional; no datos reales sin permiso específico | Revisión de alcance, autorización humana y dependencias; I1–I4 |
| G7 · Restore/rollback | Compatibilidad probada, filas humanas preservadas, no downgrade ciego ni función legada simulando estado nuevo | Matriz código↔esquema y ensayo de recuperación; I1–I3 |
| G8 · Archivo y negocio | Conservar migraciones históricas/contratos antiguos, archivo E4.5, `fotos_neto_apertura`, `anticipo_audit`, `cycle_audit`, auditoría de hechos y estados | Inventario antes/después y grafo FK; I3 |
| G9 · Atomicidad | Hecho, autorización, auditoría, estado e idempotencia confirman juntos o no confirman | Fallos inducidos, dos procesos, dry-run sin efectos; I2 |
| G10 · Dos informes anuales | Techo de dos contratos anuales: financiado por ciclos y económico natural; nunca tercer anual de neto reexpresado | DTO/UI con ámbito explícito y fixture diciembre→enero; I2 |
| G11 · Cobertura honesta | Ausencia no es cero; parcial nunca completa; stocks no se suman | Caídas de fuente, vacíos y reglas aditivas; I2 |

### Dependencias y exclusiones
- #548 consume G1/G4/G5/G7/G8 y la migración íntegra de metadatos de §7 antes de borrar.
- #538/#539 consumen un solo preview/confirm y mecanismo de impacto; no redefinen `dirty` ni materialidad.
- Se conservan `REFERENCE_INTEGRITY`, `SYSTEM_SALDO`/S000, identidad, duplicados, coherencia de plan y dependencias Anticipos.
- Sin catálogo nuevo de Concepto, reglas económicas nuevas, despliegue, visibilidad, caché prematura ni permisos nuevos.
- El Status del Project es gate operativo; esta entrega delegada no reclama Issue ni lo cambia. La lectura CLI falló y la alternativa GraphQL confirmó cuota agotada; el coordinador debe revalidarlo antes de publicar o iniciar otra fase.

## 2. Modelo mínimo, estados y auditoría permitida

### 2.1 Entidades propuestas para v32
No se reutiliza `cierres`: es inmutable, exige foto por FK y admite solo Cerrado. Nueva migración aditiva de datos/tablas; cambios de triggers autorizadores se instalan coordinadamente, no se promete «solo CREATE».

| Entidad | Campos y restricciones |
| --- | --- |
| `cierre_validacion` | PK/FK `ciclo`; `revision` positiva; `dirty` boolean; `dirty_desde/ultimo/origen`, motivos enum; `huella_validacion` nullable y `version_conjunto` nullable como pareja; actor/fecha/motivo de última revisión humana nullable; procedencia legada y cobertura por códigos |
| `cierre_validacion_audit` | ID técnico, ciclo, revisión, acción enum, actor, instante, motivo, intento/correlación, huellas nullable y `detalle` con DTO estricto abajo; append-only |
| `validacion_attempts` | clave + operación, hash de payload, respuesta de recibo no monetario, estado completado y caducidad; clave/hash/resultados duraderos para reintento; no payload crudo ni preview |
| `anticipo_apertura_evento` | Identidad REF/ciclo, intento, revisión de ciclo y apertura esperadas/resultantes, corte anterior/nuevo, clase, actor, fecha, motivo y huellas; append-only; sin importes |
| `anticipo_apertura_autorizacion` | Capacidad temporal transaccional ligada a intento, ciclo/revisión esperada, REF/revisión esperada y cortes; fases `PREPARADA/CICLO_APLICADO/APERTURA_APLICADA`; unicidad por intento+REF; no sobrevive a commit correcto |

Primera revisión humana: revisión 1 si no había fila; en fila migrada revisión técnica 1 sin validación humana nueva, revisión humana posterior pasa a 2.
La migración no inventa actor humano ni fecha: conserva campos legados con su procedencia, y los campos de revisión del nuevo conjunto quedan null.
`huella_validacion=null` significa que no existe referencia humana comparable en el nuevo conjunto, no una huella marcadora que simule validación.
Un ciclo migrado puede estar Pendiente con referencia histórica, sin haber validado el conjunto nuevo.
`dirty=0` exige referencia humana del conjunto y metadatos completos; fila migrada sin referencia nueva exige `dirty=1`.
`dirty_desde` es primera marca pendiente, `dirty_ultimo` última operación material; migración/restore tienen origen explícito.
Cobertura usa nombres de fuentes y enums Disponible/Parcial/NoDisponible con códigos; nunca texto financiero ni cantidades.

### 2.2 Tres estados visibles y dos atributos derivados
| Estado UI / DTO | Condición | Acción |
| --- | --- | --- |
| Sin validar / `SinValidar` | Sin fila, tras consulta válida al esquema | Validar |
| Validada / `Validada` | Fila, `dirty=0` y referencia humana **vigente y comparable** con el conjunto actual | Revalidar voluntariamente |
| Pendiente / `Pendiente` | Fila, `dirty=1` | Confirmar revisión |

`divergenciaValidacion = Igual | Distinta | NoComparable`: compara actual vs última huella humana solo con mismo conjunto.
`pendienteSinDelta` es atributo true exclusivamente si Pendiente y divergencia Igual; no es un cuarto estado.
`revalidacionSugerida=true` si el conjunto vigente no coincide con la referencia; no marca automáticamente.
No existe Abierto/Reabierto/Recerrado en este contrato; el estado temporal del ciclo permanece separado.

### 2.3 DTO de auditoría: lista blanca normativa
La prohibición es de cifras financieras o datos para reconstruir resultados, no de dígitos dentro de IDs, fechas o huellas técnicas.
Se prohíben números JSON genéricos, incluso anidados, y valores monetarios como cadenas en campos libres de estructura.
Los únicos campos permitidos en `detalle` son los siguientes; objeto exacto, `additionalProperties:false` en cada nivel:

```ts
type DetalleValidacion = {
  hechos: Array<{ entidad: EntidadPermitida; id: IdExistente; revision: RevisionDecimal }>;
  ciclos: Array<{ id: CicloId; impactos: CodigoImpacto[] }>;
  cobertura: Array<{ fuente: FuentePermitida; estado: EstadoCobertura; causas: CodigoCobertura[] }>;
  procedencia: null | {
    tabla: TablaLegadaPermitida; id: IdLegado | null; version: RevisionDecimal | null;
    reaperturaId: IdLegado | null; activa: boolean | null;
    versionOrigen: RevisionDecimal | null; versionDestino: RevisionDecimal | null;
    correlacion: IdTecnico | null
  };
};
```
`EntidadPermitida`, fuentes, tablas y códigos son enums cerrados de los dominios instalados, no strings arbitrarios.
`IdExistente` valida formato exacto del dominio y existencia/correlación al escribir.

`procedencia.id` es `IdLegado | null`. Cuando la tabla legada tiene clave de una sola columna, `id` la lleva como texto decimal canónico. Cuando su **clave es compuesta** —caso de `cierre_vinculos`, cuya PK es `(ciclo, version_destino)`— `id` queda `null` y la identidad se expresa **solo** con los campos estructurados (`versionOrigen`, `versionDestino`, `reaperturaId`, `correlacion`). No se inventa una identidad concatenada ni se mete un texto no numérico en un campo decimal: la tupla estructurada **es** la identidad.

**Serialización: todo el DTO viaja como JSON sin un solo `number`.** `RevisionDecimal`, `IdExistente` e `IdLegado` se serializan como **texto decimal canónico** (sin signo, sin ceros a la izquierda, sin exponente, sin separador de miles), y además se validan semánticamente: `RevisionDecimal` debe coincidir con la revisión real de la entidad referenciada en el momento de escribir, `IdExistente` debe existir o correlacionar con el hecho, e `IdLegado` debe pertenecer a la tabla declarada. Copiar el número que llegue en el payload no basta: un decimal válido en forma y falso en semántica se rechaza. Así la regla «ningún `number` JSON» es una **comprobación de tipo mecánica**, no una lista negra de nombres, y no existe excepción alguna que abrir.
Campos superiores exactos del evento: `id,ciclo,revision,accion,actor,instante,motivo,intento,correlacion,origen,huellaAnterior,huellaPosterior,detalle`.
`origen` es `IdTecnico | null` en texto y declara la procedencia del acto cuando no nace de una operación de usuario —caso de las migraciones, con la forma `MIGRACION:<tabla>:<identidad>`—. Es identidad, no magnitud: no puede contener cifras financieras y se valida contra el catálogo de tablas legadas. Existe como campo propio precisamente para no colapsarlo en `correlacion`, que identifica el intento idempotente y puede estar ya ocupado.
Actor viene de sesión/usuario único del servidor; instante UTC ISO; IDs e intento con formato y longitud acotados; huellas SHA-256 de 64 hex o null.
Motivo es texto humano obligatorio en rectificaciones y revisión parcial (máximo 1000 en operación de ciclo; 2000 en evento general); no se vuelca payload, SQL, error ni preview en él. No se pretende impedir que el humano escriba una cifra incidental en prosa: no es un campo de informe ni un canal del escritor para cifras calculadas.
No existen `antes`, `despues`, `valores`, un mapa extensible ni objeto JSON arbitrario. No se serializa directamente ningún objeto de dominio.
Identidad, motivo, actor, fechas, procedencia, cobertura, correlación y huellas son toda la evidencia nueva de revisión.

**Enforcement obligatorio (G3):**
1. Constructor central copia solo los campos anteriores y valida estrictamente; rechaza claves extra, tipos incorrectos, enums/IDs/revisiones no válidos, arrays excesivos y **cualquier valor de tipo `number`**, sin excepciones: revisiones, identificadores y versiones llegan como texto decimal canónico y se validan también en semántica.
2. DB comprueba objeto exacto y claves anidadas mediante triggers de INSERT/UPDATE con `json_each/json_tree`, tipos, enums y referencias; no basta `json_valid` ni una lista negra de nombres. SQL directo con `{"x":123}` o `{"hechos":[{"importe":"12"}]}` falla.
3. Todo escritor de estado, hecho, `audit`, `cycle_audit`, `anticipo_audit`, intentos, export, logs y errores se inventaría y prueba: ninguno recibe el preview ni añade magnitudes derivadas. Las auditorías de hechos ya existentes preservan su contrato propio y originales: no se reescribe historia ni se prohíbe su dato de negocio autorizado; sí queda prohibido añadirles copias de resultados/preview para eludir esta regla.
4. Pruebas de mutación introducen números bajo claves desconocidas y conocidas, arrays, strings monetarios en posiciones técnicas y objetos anidados. Observador SQL compara todas las escrituras del escenario y detecta fugas de valores-canario del preview fuera de los hechos de negocio autorizados.
5. Inventario de escritores cerrado: prueba estática de import/SQL obliga a usar constructor y DB valida aun si se salta el servicio. Los tests incluyen ambos caminos.

### 2.4 Revisión, invariantes y recibos
Auditoría no admite UPDATE/DELETE. En misma revisión solo cambian marcas/metadatos de pendiente, nunca la referencia humana.
Validar/revalidar/confirmar revisión exige exactamente `NEW.revision=OLD.revision+1`; un salto mayor o disminución falla en trigger específico.
Marcar/reiterar exige `NEW.revision=OLD.revision`; no se atribuye al trigger antiguo (que solo rechaza disminuciones) una protección inexistente.
Las ramas de trigger verifican también qué columnas pueden cambiar y el evento/autorización de operación; no se decide por un parámetro libre del cliente.
Revalidar escribe nueva referencia humana y evento, manteniendo eventos anteriores. Confirmar revisión es la única limpieza de una fila pendiente.
Respuesta durable de confirmación: recibo `{operacionId,ciclos:[{id,revision,estado}],auditIds,cierresDirty:[{ciclo,rango,estadoValidacion,validado,dirtyPrevio}]}` sin cifras, con la forma exacta de ANEXO-INTERFACES §2. `cierresDirty` lista los ciclos que **quedaron** marcados tras esta operación, incluidos los que **ya estaban** pendientes por otra causa (`dirtyPrevio=true`); no se deriva de `ciclosAfectados`, no incluye cifras y no se persiste como recibo. Consultar informes es otra lectura no idempotente por contenido.

**Tokens de previsualización.** `contextRevision` e `impactRevision` los calcula el servidor en el preview y son opacos para el cliente. `contextRevision` cubre el estado estructural que la operación lee: revisiones de las filas implicadas, ciclo y conjunto vigente. `impactRevision` cubre el resultado medido: huella del universo afectado, candidatos e impactos. Cualquier cambio de revisión leída invalida `contextRevision`; cualquier cambio de validación, cobertura, conjunto o magnitud medida invalida `impactRevision`. Ninguno de los dos sustituye a `fingerprint`, que identifica **el payload** de la operación: los tokens identifican **el estado** contra el que se midió.

## 3. Impacto material, preview y transacción

### 3.1 Universo financiero canónico
`H_v(C,S)=sha256(JSONcanonico(M_v(C,S)))`, mismas unidades y reglas en antes y después.
JSON canónico ordena claves y conjuntos, usa céntimos enteros en cadenas, cantidades exactas y null explícito; no floats.

| Grupo | Incluido | Excluido |
| --- | --- | --- |
| Ventana | Inicio, Fin derivado, S0 | Etiquetas temporales |
| Flujo | Bruto, devolución económica atribuida, GRE, ingreso, neto, Comida neta | Cobertura como si fuera cifra |
| Stock | Efectivo total a Fin excluyendo Exterior/S000; posiciones por instrumento | Composición por cuenta como total validado |
| Atribución | ID hecho, IDs Partida/categoría/subcategoría/deuda/presupuesto, signo, neto y ciclo atribuido; reparto aplicable | Nombres y texto literal |

Las funciones de dominio existentes determinan cada componente; #538 es dueño del predicado elegible de neteo.
`Concepto` se compara por efectos en atribución/flujo, nunca se declara inerte por nombre. Un cambio coordinado de Concepto y Partida puede ser material; una errata sin efecto no.
No se afirma que texto libre cree automáticamente clasificación: no se reabre SPEC02/04.
Traspaso interno con total/atribución/posiciones iguales no marca; una fuente caída sin cambio financiero cambia cobertura, no `dirty`.
Si falta una fuente necesaria para calcular impacto, no se trata como igualdad: preview declara NoDisponible y la operación que exige esa comprobación falla de forma explícita; la validación humana parcial de §5 es un caso distinto.

### 3.2 Dos comparaciones distintas
```
impactoOperacion(C) = H_v(C, despues) != H_v(C, antes)
divergenciaValidacion(C) = comparar H_v(C, actual) con referencia humana
                         solo si referencia y version son comparables
```
La primera se calcula en la misma transacción/snapshot y versión vigente para ambos lados; **solo ella gobierna la marca de una operación**.
La segunda es diagnóstica; Igual/Distinta/NoComparable nunca autoriza limpiar ni suprime el impacto. Una referencia humana **no comparable** —otra versión de conjunto, huella nula o cobertura distinta— cambia los atributos de la proyección (`validado=false`) y mantiene el ciclo en **Pendiente**; **no** lo limpia, **no** lo convierte en `SinValidar` y **no** reescribe la referencia histórica.
Aunque la fila tenga otra versión de conjunto o huella null, un impacto actual se detecta y conserva/marca Pendiente.
Cambiar solo el algoritmo/conjunto no marca masivamente por comparar universos distintos; se muestra revalidación sugerida.
Cambios de semántica de lectura como reexpresión #538 son una operación de transición explícita: oráculo antes/después de reglas, universo común y evidencia; no un efecto colateral de GET ni una comparación entre hashes incompatibles.

| Situación | Cambio de estado/auditoría de validación |
| --- | --- |
| Sin fila | No crea validación; informe vivo se actualiza |
| Validada + impacto | Pendiente, primer instante y motivos; `dirty_marcado` |
| Pendiente + no-op/texto sin efecto | Conserva todo `dirty_*`; no `dirty_reiterado`; solo auditoría propia del hecho si procede |
| Pendiente + nuevo impacto | Conserva primer instante, actualiza último/motivos; `dirty_reiterado` |
| Operación material vuelve a referencia comparable | Conserva Pendiente; evento `reversion` en lugar de duplicar reiteración; atributo pendienteSinDelta |
| Revisión humana confirmada | Nueva revisión + huella actual y limpieza; informes idénticos |

Motivos cerrados de impacto material: FLUJO_CICLO, BALANCE_FIN, POSICION, ATRIBUCION, REPARTO, COMIDA, VENTANA_CICLO, S0_CICLO.
MIGRACION, RESTAURACION, REAPERTURA_ACTIVA, REEXPRESION_ATRIBUCION describen **procedencia o transición**, y REVERSION es una **acción**; ninguno es una magnitud nueva.
**El campo `motivo` solo admite el primer conjunto.** Las causas de procedencia o transición van en `origen` (`MIGRACION:<tabla>:<identidad>`) o en `accion`, nunca en `motivo`.

Un ciclo puede quedar **Pendiente por dos caminos distintos**, y la fila debe distinguirlos:

| Camino | Qué lo produce | `motivo` | Cómo se lee la causa |
| --- | --- | --- | --- |
| **Cambio material medido** | Una operación del usuario altera una magnitud del universo | Uno de los motivos cerrados | `motivo` del evento |
| **Transición de estado** | Migración conservadora, restauración de hechos fuera de banda o reacreditación de Anticipos: hechos que entran o se reorganizan sin que una operación de usuario mida el delta | **`null`** | `accion` + `origen` de la transición |

Una transición **sí** deja el ciclo en Pendiente —es una revisión humana pendiente, no un cambio medido—, pero **nunca se presenta como un motivo material**: inventar `MIGRACION` como motivo haría indistinguible una migración de una corrección real, que es justamente lo que la auditoría debe separar.

### 3.3 Candidatos y propagación
Unión de ciclos por fechas antiguas/nuevas, compras enlazadas y sus ciclos derivados, repartos, revisiones de Comida y consumidores dependientes.
Para stock: ciclos cuyo Fin sea posterior o igual al mínimo de fechas afectadas; comparar realmente, no marcar por pertenecer al conjunto candidato.
Para Inicio: **ciclo corregido y predecesor** por sus ventanas; sucesor permanece frontera fija, no se cruza y su ventana no cambia.
Puede haber otros candidatos indirectos por saldo, atribución, financiación o dependencias; cada uno requiere antes/después y motivo medido.
Una devolución tardía atribuida a una compra de un ciclo anterior puede afectar ese ciclo económico aunque no cambie su ventana.
Se recalculan periodos dependientes; periodos no tienen estado de validación/dirty propio.

### 3.4 Secuencia preview/confirmación
1. Preview autenticado, sesión/MFA/CSRF vigentes; valida payload, revisiones, duplicados y guardas reales.
2. En snapshot consistente: toma antes, `SAVEPOINT`, aplica el mismo procedimiento de dominio, calcula después/candidatos/impactos, deshace **todo** el dry-run.
3. Devuelve cifras antes/después solo en memoria/respuesta `no-store`, afectados, motivos, cobertura, revisiones, `contextRevision`/`impactRevision` y necesidad de motivo; cancelar no deja intento ni contador/auditoría.
4. Confirmación `BEGIN IMMEDIATE`, `busy_timeout=3000`; primero resuelve clave idempotente completada: misma clave+hash reproduce recibo **antes** de evaluar revisiones ya obsoletas; distinto payload → 409 IDEMPOTENCY_CONFLICT.
5. Intento nuevo: revalida revisiones y contexto, vuelve a medir con el mismo procedimiento. Precedencia normativa de ANEXO-INTERFACES §1: idempotencia completada, gate, estructura/existencia, revisión de movimiento, revisión de vínculo y después contexto/impacto. Si difiere de advertencia → 409 IMPACT_CHANGED sin efectos; no se acepta automáticamente una advertencia distinta.
6. Aplica hecho + autorizaciones de §4, mide antes/después reales, escribe marcas/eventos permitidos y recibo durable; verifica invariantes y ausencia de capacidades temporales, COMMIT único.
7. Fallo en cualquier paso revierte hecho, autorizaciones, auditoría, marcas e intento. Tras commit, la UI refresca informes vivos y estado.
Clave+payload idénticos no compiten: reproducen respuesta. Claves distintas con revisión/preview común sí compiten y una debe refrescar.
Expirar una clave no autoriza reutilizarla: se conserva tombstone hash/recibo mínimo para idempotencia, no payload financiero.

## 4. Rectificaciones estructurales y Anticipos

### 4.1 Inicio y S0
Inicio es manual; Fin = día previo al siguiente Inicio. ID inmutable, Inicio único y `mes_financiado` único; nuevo Inicio debe quedar estrictamente entre vecinos y respetar resto de integridad del maestro.
Preview específico: ventana antes/después del corregido y predecesor, movimientos/revisiones reasignados, IDs y fechas inalteradas, dependencias, ciclos candidatos e impactos medidos.
El sucesor solo aparece como límite fijo y para explicar cronología, no como ventana desplazable por cruzarlo.
Motivo requerido, `cycle_operation_guard`, `contextRevision`/`impactRevision`, idempotencia y auditoría natural de ciclo + evento de estado enlazado por intento y hecho/revisión.
S0 es `ciclos.saldo_comida`, no apertura de saldo bancario; admite cero/negativos válidos. Cambiar S0 no mueve ventanas ni reasigna hechos.
S0 cambia el objeto validado; propaga solo a recursos/arrastres que realmente lo consumen, no a todos los posteriores.

### 4.2 Conservación de Anticipos
`fotos_neto_apertura` es declaración de negocio E3.1 por REF+ciclo con evidencia y procedencia, no foto financiera E4.9–E4.11.
Se conservan importe declarado, evidencia, procedencia, cobertura, confirmado, revisión y auditoría original. No se sustituye por pendiente actual.
Inicio actúa como corte declarado; se elimina el veto absoluto por tener declaración y se sustituye por procedimiento autorizado.
Clase A: sin hechos entrantes/salientes y declaración coherente con corte nuevo → reanclaje automático auditado, sin nueva confirmación humana.
Clase B: entran/salen hechos o evidencia/importe no concuerda → ANTICIPO_APERTURA_INCOHERENTE; exige por REF importe explícito, evidencia, procedencia, cobertura, confirmado y motivo de reacreditación. Sin evidencia no guarda Inicio.
Las cifras propuestas viven en preview y en el dato de negocio confirmado cuando corresponda; evento de autorización/validación lleva identidad y huellas, no importes anteriores/nuevos.
Se mantienen dependencias de Adelanto, rol/par, ficha, evidencia y `protectAnticipoChange` para proteger datos de negocio reales; no por cierre.

### 4.3 Orden exacto y autorización no reutilizable
La existencia histórica de un evento `(X→Y)` **no autoriza nada**. Autorización es capacidad transaccional nueva, bajo servicio único; SQL externo no es API.
1. `BEGIN IMMEDIATE`; resolver idempotencia y comprobar revisión actual de ciclo y cada apertura; generar intento nuevo ligado a contextRevision/impactRevision y hash de payload.
2. Leer cortes/valores viejos X; validar clases A/B; insertar un evento append-only por REF con intento, revisiones, X→Y, huellas y clase. Insertar capacidades PREPARADA vinculadas a esos eventos y revisiones exactas.
3. **Actualizar primero `ciclos.inicio` X→Y y revisión r→r+1.** Trigger examina fotos todavía en X y exige capacidad PREPARADA para cada REF con revisión/corte vigentes, intento del guard activo y evento exacto. Trigger cambia fase a CICLO_APLICADO.
4. **Después actualizar cada apertura** X→Y, revisión a→a+1 y, solo en clase B, dato declarado acreditado. Trigger exige CICLO_APLICADO, ciclo ya en Y/r+1, apertura aún X/a y evento de ese intento. Consume pasando a APERTURA_APLICADA.
5. Escribir auditoría propia del dominio sin copiar preview, recalcular dependencias y `dirty`; comprobar todas las aperturas con corte=ciclo.inicio y revisiones esperadas.
6. Eliminar capacidades temporales y guard dentro de la transacción, guardar recibo y COMMIT. Excepción → rollback total; evento histórico solo queda si operación completa.
SQLite no ofrece triggers diferidos al commit: servicio único verifica la invariante final; tests de integridad y verificador la vuelven a comprobar. No se promete invulnerabilidad frente a SQL arbitrario con permisos de alterar esquema.
X→Y→X incrementa revisiones cada vez; repetir X→Y necesita intento y capacidad nuevos con nuevas revisiones. Evento antiguo, capacidad consumida, intento completado o revisión antigua no pasan los triggers.
Un reintento con misma clave+payload reproduce recibo, no crea capacidad ni altera nuevamente corte.
Al adelantar Inicio se protegen menos hechos `fecha<=corte`, al retrasarlo más; preview identifica cuáles y `anticipoRevision` se invalida.

## 5. Validación, precontrol y UX

Validar exige ventana finita y S0 presente, consistencia de núcleo y plan verificable. SinPlan es permitido.
Sin siguiente Inicio → SIN_SIGUIENTE_INICIO; sin S0 → S0_AUSENTE; confirmar no salva una incoherencia.
Backup ausente y E3.5/FIN_NETA no disponible **no bloquean validación financiera**; la segunda exige cobertura parcial explícita y motivo. G5 sigue gate operativo obligatorio.
Precierre conserva ventana/S0, movimientos, plan, inversión, E3.5, E3.6, duplicados, integridad, cobertura y avisos; solo lectura.
Se retiran contraste con fotos posteriores, bloqueo por cierre fuera de orden y `e4_9Bloqueado` como autoridad. Si hay campo legacy informativo, no gobierna ni presenta bloqueo funcional.
Validar/revalidar usa preview+confirmación; confirmar revisión pendiente es acción humana explícita con referencia actual y motivo cuando la cobertura lo exige.

```text
Ciclo [ID] · Ventana [Inicio — Fin] · [Sin validar | Validada | Pendiente]
Cobertura [Completa / Parcial + causas]   [Revalidación sugerida si procede]
Pendiente desde [...] · Motivos [...] · [Sin divergencia actual, si procede]
[Ver informe vivo] [Validar / Revalidar / Confirmar revisión]
Advertencia: cambia ciclos [...]; motivos [...]; antes/después [solo memoria]
[Cancelar] [Confirmar con motivo]
```
La marca no usa solo color. Teclado/foco, lectores, errores por campo, móvil 390 y escritorio 1440 según tokens existentes; no nueva apariencia.
Carga, vacío, Sin validar, NoDisponible, parcial y error son distinguibles; error no dibuja Sin validar.
409 conserva borrador y exige nuevo preview; cancelar no escribe. Sin navegación a fotos/reapertura.

## 6. Informes vivos y dos ejercicios explícitos

### 6.1 Superficie y contratos
| Ruta / superficie | Contrato |
| --- | --- |
| `GET /api/informes/ciclo/:id` | Ventana, magnitudes, atribución, cobertura y estado de validación |
| `GET /api/informes/periodo?tipo=Trimestre|Anio&ejercicio=&trimestre=` | **Informe financiado por ciclos**; ámbito explícito `FinanciadoPorCiclos` |
| Plan anual / Resumen anual económico existentes | **Informe económico de año natural**; ámbito `NaturalCompra`; consumen #538 |
| `GET /api/cierres/:id/estado` | Estado de §2, revisión, dirty, motivos, cobertura, divergencia y versión; sin reapertura |
| `GET /api/cierres/:id/validacion/preview` | Preview de revisión no persistente |
| `POST /api/cierres/:id/validar` y `/revision/confirmar` | Recibos de §2, no informes persistidos |
| `POST /api/impacto/preview` | Envoltorio común de escrituras; adaptadores de dominio reutilizados |

El contrato anual tiene **techo de dos informes distintos**, no dos pantallas obligatorias nuevas: se reutilizan superficies actuales. Una vista bancaria es bloque del informe natural, no tercer contrato anual.
1. **Informe financiado por ciclos:** cada ciclo íntegro por `mes_financiado`; trimestre/año financiado. GRE de compras del ciclo, aunque fecha natural sea de diciembre y financiación enero.
2. **Informe económico de año natural:** GRE por año de fecha de compra; devolución elegible sigue a compra; bloque bancario por fecha real del hecho, claramente separado. Consumidores y detalles de elegibilidad pertenecen a #538.
Nunca se promete igualdad entre ambos años, ni se suma GRE a flujo bancario. Respuestas/etiquetas/export indican ámbito y regla temporal.
No se añade informe de neto reexpresado, selector de semánticas oculto ni un tercer anual. #538 corrige su matriz en paralelo y debe referenciar este contrato.

### 6.2 Aditividad, ausencia y datos bancarios
Dentro del **mismo ámbito**: flujos suman; suma de trimestres financiados = anual financiado exacto; en año natural particiones por fecha de compra reconcilian con su anual.
Stock no suma: Fin del último ciclo/corte explícito, etiqueta NO_ADITIVO; sin regla `total:null` y motivoTotal.
Vacío financiado → SIN_CICLOS_EN_PERIODO; no hechos verificados y fuente ausente se distinguen de cero real. Parcial nunca completa.
Se reutilizan adaptadores vivos existentes (`e411-contraste.ts`, `monthlyFlow`) solo donde su semántica coincida; no se atribuye a ese motor bruto un neto que aún no calcula.
Neto GRE usa predicado único #538. Abono conserva fecha/saldo y no crea ingreso, compra ficticia ni presupuesto operativo retroactivo.

### 6.3 Fixture anual y frontera con devolución tardía
Fixture sintético, no datos reales, oráculo independiente por enumeración de hechos y enlaces (no llama al motor ni al hash bajo prueba):
- P: Inicio 2026-11-25, financiado diciembre 2026; compra p el 2026-12-10 por 100.
- C: Inicio 2026-12-25, financiado enero 2027; compra q el 2026-12-27 por 60.
- D: siguiente Inicio 2027-01-25, financiado febrero 2027; cierra ventana de C.
- Abono d el 2026-12-28 por 30, enlazado y elegible para p; no cambia la fecha de compra ni la del cobro.
Con D presente, GRE P=70, GRE C=60; anual financiado 2026=70, 2027=60; GRE natural 2026=130, natural 2027=0 si cobertura demuestra vacío completo.
Al corregir Inicio C de 2026-12-25 a 2026-12-29 (sin cruzar vecinos ni mes financiado), q pasa a P; GRE P=130 y C=0; natural 2026 sigue 130. El abono cambia de ventana bancaria C→P, pero descuenta siempre p en P.
Oráculo reconcilia: movimientos q y d mantienen IDs/fechas/importes, composición bancaria cambia de ventana, clasificación económica y saldo a cada Fin se recomputan según cortes. Marca solo candidatos con cambios reales.
Caso adicional **crear D cuando antes no existía**: el Fin de C deja de ser abierto/corte y las atribuciones/cobertura se recomputan; una devolución tardía que era elegible para una compra anterior puede cambiar cobertura/atribución económica según reglas vigentes y afectar ciclos anteriores. No se impone que todos los anteriores al último permanezcan inmutables.
El fixture de creación fija corte previo, estados de elegibilidad y cobertura en ambos lados; compara salidas con oráculo independiente por ámbito. Cada diferencia debe atribuirse a ventana, stock, cobertura o propagación de enlaces, nunca se descarta por afectar a un ciclo más antiguo.
Añadir la variante con d después de D: GRE sigue p; el saldo sube en fecha real en D y posteriores con Fin afectado; no netea gasto de D.

### 6.4 Rendimiento
Cálculo vivo incluso >12 meses. Medir p50/p95 con 36 ciclos y ~10000 movimientos sintéticos, presupuesto declarado antes de medir.
El presupuesto se declara **antes** de medir y se cumple o no se cumple como **medición publicada**: es verificable como cifra medida, no como garantía de producto. No se fija aquí un umbral inventado sin baseline. No habilitar caché hasta evidencia y decisión técnica registrada; derivada e invalidada por financeRevision, relaciones/clasificación y maestro de ciclos, nunca fuente de verdad.

## 7. Incrementos compatibles, migración y recuperación

### 7.1 Cuatro incrementos, no una etapa por mecanismo
| Incremento | Unidad compatible / aceptación | Recuperación |
| --- | --- | --- |
| I1 · Esquema + transformación | v32, DTO/guardas de datos, importación conservadora y metadatos; paquete compatible C32 antes de exposición | Restore íntegro en copia o corrección hacia delante; E1b es parte de I1, sin rollback propio |
| I2 · Lectores/escritores/UI + guardas | Activación conjunta de informes/estado/preview, validación, correcciones y Anticipos; retirada funcional legacy; pruebas completas y rendimiento | Binario de recuperación R32 compatible, conserva lectura de estado; suspende escrituras y funciones incompatibles |
| I3 · Retirada física #548 | Solo tras aceptación #547 y autorización propia; metadatos reconciliados, grafo FK y restore compatible | Backup completo más estado nuevo, restaurado con binario R33/C33 compatible; nunca C31 sobre v33 |
| I4 · Documentación | SPECs propietarias, contratos API, runbook y evidencia aprobada, sin duplicación | Historial documental, sin revertir reglas económicas |

I1/I2 son unidades de entrega compatibles, no autorización de DEV. Sin doble escritura ni generación de fotos de transición.
No exponer C31 junto a v32 ni la vieja UI consumiendo rutas de estado anteriores. La versión posterior a retirada se denomina v33 en esta propuesta, su número definitivo se coordina con #548 sin colisionar migraciones.

### 7.2 Migración conservadora: decisión explícita
**Se elige migrar todos los cierres legados como Pendiente**, sin crear ninguna validación limpia por equivalencia de fotos.
No existe proyector semántico demostrado para validar el conjunto nuevo; igualdad de totales/digest no es evidencia humana de atribución, cobertura, ventana/S0 y posiciones.
Por cada ciclo con alguna fila en `cierres`, última versión es referencia legada, no validación nueva: crear fila revisión técnica 1, dirty=1, `accion='migracion'`, `origen='MIGRACION:cierres:<ciclo>'`, `motivo=null` y procedencia completa: la causa se lee del evento como transición, no como motivo material.
Conservar actor, fecha y motivo originales en campos de procedencia/auditoría permitidos; no presentarlos como nueva validación del conjunto.
`huella_validacion/version_conjunto=null`; huellas de fuente/datos pueden ser evidencia de integridad en evento, no una referencia financiera humana.
Sin cierre legado no se crea fila. Foto legible, divergente, ausente, ilegible o incompleta produce código de cobertura/procedencia, nunca limpieza automática.
Sin siguiente Inicio o incoherencia del maestro: preservar evidencia legada en estado pendiente y diagnóstico; bloquear activación para el conjunto incoherente hasta reparación aprobada, sin inventar ventanas ni perder identidad.
Si existe ya fila humana por repetición/restore, no se sobrescribe: upsert solo ausencia y reconciliación de recibo de migración.
Informe sin cifras: identidades, casos/cobertura, conteos de pendientes/limpias y origen. Inicialmente limpias nuevas por migración = cero; total pendiente esperado = ciclos legados distintos no previamente transformados.
No se afirma paridad foto/vivo; diferencias semánticas se verifican por oráculo, no se almacenan valores. Foto de periodo no crea validación de periodo.

### 7.3 Metadatos que deben sobrevivir antes de borrar
Migrar **antes de cualquier borrado** `reaperturas`, `reapertura_activa` y `cierre_vinculos`, no solo sus eventos aparentes.
Por fila activa: evento `legado_reapertura_activa` con ciclo, ID de reapertura, `activa:true`, actor/fecha originales y procedencia; fila del ciclo pendiente por transición (`accion` de reacreditación y `origen` del evento), con `motivo=null`: REAPERTURA_ACTIVA describe la procedencia, no un motivo material.
Por vínculo: evento `legado_cierre_vinculo` con ciclo, versión origen/destino, reapertura_id y correlación exactas; no se supone reconstruible desde otra tabla.
Migrar identificadores/acciones/actor/fecha/motivo de cierre_audit y reaperturas a eventos legados permitidos; no copiar JSON financiero ni payloads de intentos.
Por periodo: identidad, versiones técnicas y ciclos componentes con procedencia; ninguna cifra ni nuevo estado validado de periodo.
Los metadatos de **periodo** y cualquier identidad **compuesta** que no quepa en el DTO de auditoría no se fuerzan dentro de un evento: viven en el **manifiesto de migración** con identidad tipada por tabla y PK, junto a la procedencia y el `observado_utc`. El DTO de §2 admite las acciones y campos de procedencia de los eventos ligados a ciclo; versiones son metadatos técnicos, nunca importes. #548 **consume** ese manifiesto y no puede inventar su contenido ni descartar identidades.
Recibo único por tabla+PK de origen garantiza repetición sin duplicación. Reconciliar identidades, relaciones origen→destino, singleton activo, conteos y huellas técnicas de metadatos; originales intactos hasta I3.
#548 recibe manifiesto de migración aceptado y no puede descartar esos punteros/vínculos. FK destino solo a identidades preservadas, no a tablas que se retirarán.

### 7.4 Matriz código↔esquema y rollback funcional
| Código | v31 legado | v32 I1/I2 | v33 retirada |
| --- | --- | --- | --- |
| C31 binario anterior | Solo antes de transición; contrato legado | **Rechaza arranque**, no hay rollback funcional | **Rechaza arranque** |
| C32 migrador/lector compatible | Verifica contrato y migra exclusivamente con gate G5 | Lee validación nueva; I1 mantiene nuevas escrituras desactivadas hasta I2 | Rechaza por desconocido |
| R32 recuperación, construido y probado para v32 | No se usa como downgrade | Lee estado real nuevo, exporta/restaura; escrituras y funciones incompatibles retiradas | Rechaza por desconocido |
| C33/R33 compatible con retirada | Solo importa/restaura vía ruta autorizada de actualización | Actualiza bajo gate probado | Lee validación real, sin dependencia de fotos; recuperación en modo restringido |

Conservar filas no basta: antes de activar I2 debe existir artefacto R32 que arranque sobre contrato v32 exacto y lea las últimas validaciones, dirty y auditoría.
Rollback normal cambia a R32: mantiene lectura de estados/informes compatibles y retira alta/validación/corrección si no son seguras; UI indica modo recuperación. Retira también cerrar/reabrir/fotos y cualquier panel viejo que use `cierres`.
Si solo hay C31 disponible, **no se ejecuta sobre v32**: parada controlada del servicio, export/backup, recuperación R32 o reparación hacia delante. Indisponibilidad declarada no equivale a Sin validar.
Volver a copia v31 implica perder hechos posteriores si se hace ciegamente; prohibido como rollback rutinario. Recuperación autorizada debe reconciliar todos los hechos y validaciones posteriores con paquete compatible antes de reabrir servicio; si no puede, permanecer parado y elevar bloqueo.
Nunca bajar `schema_version`, editar manifiesto para engañar al binario, reintroducir guardas por cierre o convertir validaciones recientes en «sin validar».

### 7.5 Export/restore y backup
Export de estado nuevo incluye esquema/contrato exacto, filas, auditoría, procedencia/recibos migración, claves idempotentes mínimas y manifiesto/checksum; ningún preview ni importe.
Datos de negocio Anticipos y hechos se incluyen en **backup íntegro del dominio**, no en acta de validación; ambos son necesarios para recuperación completa.
Export y copia consistentes en misma barrera de mantenimiento, con identidad de dataset. Restore verifica digest, esquema, IDs, FKs, secuencias/contador y correlaciones.
Ensayo en copia: export→DROP de tablas nuevas solo en copia autorizada de test→recrear contrato→restore.
Aserción exacta: **filas originales de estado idénticas, eventos originales intactos con mismos IDs/orden/correlaciones, más un único evento `restauracion` por restoreId** en auditoría global de recuperación permitida; no se exige auditoría total idéntica.
Repetir restoreId+payload reproduce recibo y no agrega otro evento; distinto payload falla. Contador posterior queda por encima de IDs restaurados.
Este ensayo de round-trip del mismo dataset conserva dirty, sin limpieza ni marcado global artificial.
Restore/import que **sustituye hechos fuera de banda**, incluso backup antiguo, marca todas las filas afectadas de validación Pendiente por **transición** —`accion` de restauración, `origen='RESTAURACION:<ref>'`, `motivo=null`—; conserva referencia humana y procedencia, no la borra ni crea revisión humana.
Antes de sustituir, exportar estado actual. Backup pre-v32 se transforma conservadoramente y se reconcilia con export actual: si faltan ciclos/hechos de validaciones humanas posteriores, no se declara recuperación completa ni se abre operación; primero restaurar/reconciliar hechos faltantes con evidencia.
Gate G5: restauración ejecutada en copia aislada, `integrity_check=ok`, `foreign_key_check` vacío, conteos/IDs de ciclos, movimientos, saldos, referencias y estado reconciliados. Sin evidencia restaurable no se toca dato real.

### 7.6 Retirada física y contratos legacy
#547 deja intactas tablas de fotos; #548 calcula orden hijos→padres del grafo real FK, incluidos ciclos de FK diferidas. Si hay grafo cíclico necesita plan de rebuild probado, no lista manual que finja orden topológico.
Diferir FK no permite dejar huérfanos al commit. `foreign_keys=OFF` no es atajo: cualquier necesidad de rebuild debe tener prueba específica, comprobación de integridad antes de aceptar y contrato exacto nuevo.
Conservar migraciones y manifiestos v31/v32 para importar backups anteriores, más contrato v33; no retirar `fotos_neto_apertura` ni auditorías de negocio.
En I2 se retiran funcionalmente `closedWindows`, `hasClosures` y familia `assert*Closure*`, `informativeFields/closedFieldDecision`, `coherenciaCierresPosteriores` y HISTORY_LOCKED motivado por cierre. Sustituto de estado falla 503 si tabla/contrato ausente; las guardas reales siempre se evalúan por su motivo.
POST legacy `/cierres/:id/cerrar` → 410 CIERRE_FOTOGRAFICO_RETIRADO; reapertura/reabrir/repreflight/recerrar/cancelar → 410 REAPERTURA_RETIRADA. No se presenta un POST retirado como alias «de solo lectura».
`GET /api/fotos/contraste?ciclo=` → `410 FOTO_RETIRADA` con `sustituto` y `Link` al informe vivo, sin redirección; `/api/fotos/periodos*` y `/api/fotos/ciclos/*` → `410 FOTOS_RETIRADAS`; `/api/cierres/:id/foto` → `410 FOTO_RETIRADA`. El código se fija por ruta, no por prefijo: ninguno responde `3xx` ni `500`. Ninguna consulta financiera legacy muestra foto como alternativa.
Nuevos errores de advertencia usan `validaciones[]`, no `cierres[]` con versiones falsas. API y UI se actualizan juntas en I2; no Accept-Version ni version:null inventadas para mantener dos semánticas.
Scripts externos desconocidos reciben retirada explícita; inventariarlos antes de activación. Integridad/duplicados conservan códigos propios.

## 8. Reconciliación explícita de SPEC26/27/28/29

Identificadores verificados contra `specs/26-e48-precierre-specification.md`,
`specs/27-e49-cierre-financiero-specification.md`, `specs/28-e410-reapertura-specification.md`
y `specs/29-e411-fotografias-specification.md` en `e7a9f7fd`. La versión anterior de esta
tabla citaba números de AC que no correspondían a su contenido: queda corregida y **es esta
la que se somete a registro**.

### SPEC26 · E4.8 precierre

| AC | Contenido | Decisión |
| --- | --- | --- |
| AC-01 | Ventana finita y S0; `Listo`/`Listo con avisos` | **Conservado** |
| AC-02 | Sin siguiente Inicio → bloqueo | **Conservado** |
| AC-03 | Sin S0 → bloqueo | **Conservado** |
| AC-04 | Movimientos, clasificación o Referencias inconsistentes | **Conservado** |
| AC-05 | Posiciones E4.1, incluidas operaciones anteriores | **Conservado** |
| AC-06 | Sin Compras nuevas con posiciones / sin operación histórica | **Conservado** |
| AC-07 | E4.3/E4.2/E4.4 no disponibles | **Enmendado**: parcial visible y no bloqueante; nunca se declara completo |
| **AC-08** | **Backup sin evidencia DT6/T-BKP** | **Sustituido**: pasa a gate G5 de migración y despliegue |
| AC-09 | POST/PATCH/DELETE en precierre | **Conservado** |
| AC-10 | Abrir precierre no altera S0 ni ventana | **Conservado** |
| AC-11 | Cambiar fuente entre preview y lectura | **Conservado** |
| AC-12 | Ciclo `SinPlan` | **Conservado** |
| AC-13 | Plan con líneas inconsistentes o no verificables | **Conservado** |
| **AC-14** | **E3.5/FIN_NETA no disponible** | **Enmendado**: cobertura parcial visible y no bloqueante para validar; nunca «completa» |
| AC-15 | `GET /api/cierres/:ciclo/estado` | **Conservado**, con `validacion` añadida y `reapertura` retirada |
| **AC-16** | **Cierres posteriores coherentes o contradictorios** | **Sustituido**: el contraste con fotos pierde objeto; se sustituye por aviso de ciclos con impacto |

### SPEC27 · E4.9 cierre financiero

| AC | Contenido | Decisión |
| --- | --- | --- |
| **AC-01** | Cerrar crea cierre **y foto** inmutable | **Sustituido**: validar no crea foto |
| AC-02 | Sin siguiente Inicio → no se cierra | **Conservado** |
| **AC-03** | Fecha en ventana cerrada → `409 HISTORY_LOCKED` | **Sustituido**: retirado; preview + `dirty` |
| **AC-04** | Mover Movimiento desde/hacia ventana cerrada | **Sustituido**: mismo criterio que AC-03 |
| **AC-05** | Reclasificar hecho de ciclo cerrado (T2), foto intacta | **Enmendado**: se conserva motivo y auditoría; no hay foto |
| AC-06 | Renombrar Partida/Instrumento (T3) | **Conservado en el fondo, enmendado en la forma**: permitido, sin bloqueo y sin `dirty` |
| AC-07 | Cerrar con posiciones anteriores y sin Compras nuevas | **Conservado** |
| **AC-08** | Cerrar con E3.5/FIN_NETA no disponible | **Sustituido**: cobertura parcial visible, no bloqueante |
| **AC-09** | Backup sin evidencia o restauración no demostrada | **Sustituido**: gate de migración y despliegue |
| AC-10 | Repetir cierre con misma clave/payload | **Conservado como principio**, reimplementado sobre `validacion_attempts` |
| AC-11 | Cambio concurrente entre preview y confirmación | **Conservado como principio** |
| AC-12 | Fallo dentro de la transacción | **Conservado como principio** |
| **AC-13** | Reabrir y cerrar de nuevo por vía ordinaria | **Sustituido**: no hay reapertura; la rectificación es ordinaria con aviso |
| **AC-14** | Consultar la foto tras T2/T3 | **Sustituido**: la única vista es la viva |
| AC-15 | Consumidor Anticipos sin proveedor real | **Conservado**: se traslada a la cobertura del informe |
| AC-16 | Posiciones anteriores incluidas a Fin | **Conservado** |
| AC-17 | Cerrar con `SinPlan` | **Enmendado**: permitido y sin bloqueo |
| AC-18 | Cerrar con `PlanNoVerificable` | **Conservado**: bloquea la validación |
| AC-20 | Cerrar con cierres posteriores existentes | **Enmendado**: «fuera de orden» deja de existir como concepto |
| AC-21 | Cerrar un ciclo sin hechos | **Enmendado**: se declara `CICLO_SIN_HECHOS_VERIFICADOS`, nunca `0` |

### SPEC28 · E4.10 reapertura — **sustituida en bloque**

`E4.10-AC01…AC24` (D1–D9: reapertura, versiones, re-cierre, cancelación, ventana de
rectificación). Sin versiones no hay reapertura, re-cierre ni cancelación: las rutas responden
`410 REAPERTURA_RETIRADA`. `E4.10-AC09` (T1 en ventana) y `E4.10-AC15` (backup) quedan sin
efecto por la misma razón que SPEC27 AC-03/AC-04 y AC-09.

### SPEC29 · E4.11 fotografías

| AC | Contenido | Decisión |
| --- | --- | --- |
| **E4.11-AC01** | La foto devuelve valores persistidos; la vista viva, recálculo | **Sustituido**: informes vivos; `e411-contraste.ts` ya era cálculo vivo |
| **E4.11-AC02** | Metadatos de foto idénticos antes y después de T2/T3 | **Sustituido**: la inmutabilidad pasa a `cierre_validacion_audit` |
| E4.11-AC03 | v1 y v2 consultables con selección explícita | **Sustituido**: sin versiones no hay selección |
| E4.11-AC04 | Agregado compuesto por fotos de ciclo | **Sustituido**: composición sobre ciclos vivos con cobertura declarada |
| E4.11-AC05 | Periodo con versiones distintas o ciclo reabierto | **Sustituido**: sin reapertura ni versiones |
| §`no disponible` | `NoDisponible` con motivo; sin relleno | **Conservado** |

### Fuera de la sustitución

`SPEC13 AC-10/AC-11`, `SPEC21 §E3.6-AC-09` (foto de Neto de apertura como negocio de
Anticipos) y `E4.5-AC-01` (archivo histórico) se **conservan** y **no** son fotografías de
cierre. `SPEC04 AC-12` se conserva y no se reabre: #547 solo retira la lista blanca de campos
inertes y mide el efecto.

**Sustitución aprobada y vigente — 2026-11-20.** La sustitución de **SPEC26 AC-08, AC-14 y
AC-16**; **SPEC27 AC-01, AC-03, AC-04, AC-08, AC-09, AC-13 y AC-14**; **SPEC28 completa**; y
**SPEC29 E4.11-AC01…AC05** quedó registrada por decisión expresa del usuario en el
[registro formal de sustitución](https://github.com/jmartinlabs/myfinanzas-app/issues/547#issuecomment-7037207679). La matriz de esta sección **no se reabre**: el
registro aprueba exactamente lo que aquí figura, y no retira por extensión reglas fuera de
ella —se conservan las fotografías de Neto de apertura de Anticipos (SPEC13 AC-10/AC-11 y
SPEC21 §E3.6-AC-09), el archivo histórico E4.5 y el criterio Concepto/Nota de SPEC04 AC-12—.
Las SPEC26/27/28/29 permanecen como documentación histórica; en lo incompatible prevalece
este contrato.

---

## 9. Criterios de aceptación vigentes — todos UNRUN

IDs contiguos tras reconciliación; el mapeo final conserva trazabilidad de la versión anterior. Cada prueba debe registrar evidencia sintética, sin datos financieros reales en Git/CI.

| ID | Acción / fixture | Resultado esperado |
| --- | --- | --- |
| **AC-01** | Gasto olvidado en ciclo validado, preview y confirmación con motivo | Guarda hecho sin reapertura; informe vivo cambia y solo impactoOperacion real marca; G1/G2/G3/G9. |
| **AC-02** | Corregir importe, anular, reclasificar y registrar devolución tardía | Identidad/fechas bancarias preservadas; rastro de hecho y estado enlazados por intento e ID/revisión; no preview persistido. |
| **AC-03** | Cambio histórico con potencial efecto posterior | Compara antes/después de todos los candidatos; marca exactamente los que cambian con motivo, no todos por fecha. |
| **AC-04** | Operar en Pendiente y confirmar revisión humana | Todas las operaciones siguen disponibles por G2; revisión limpia solo ese ciclo y los informes antes/después son iguales. |
| **AC-05** | Consultar ciclo, trimestre y ambos informes anuales | Hechos vivos, ámbito explícito; aditividad solo dentro del ámbito; fecha de cobro bancaria intacta, G1/G10/G11. |
| **AC-06** | Revalidar voluntariamente ciclo Validada | Revisión exactamente +1 y nueva referencia; eventos anteriores intactos, sin foto. |
| **AC-07** | Cambiar version_conjunto y luego aplicar una operación material | Cambio solo de conjunto sugiere revalidar; operación compara antes/después con versión vigente y marca aunque referencia antigua sea NoComparable. |
| **AC-08** | Restore/import de hechos fuera de banda | Referencia humana preservada y ciclo Pendiente **por transición** (`accion`/`origen` de restauración, `motivo=null`, nunca un motivo material inventado); recuperación restringida hasta reconciliación; no confundir con round-trip del mismo dataset. |
| **AC-09** | Validar con cobertura parcial y probar escritores adversariales de auditoría | Parcial visible con motivo; DTO exacto de G3 rechaza claves extra/números/strings financieros en posiciones técnicas por servicio y SQL; no fugas en otros escritores. |
| **AC-10** | Reintentar validar/revisar con misma clave+payload y después distinto | Mismo recibo sin nueva revisión/evento aunque preview previo esté obsoleto; distinto hash 409; tombstone evita reutilizar clave. |
| **AC-11** | Editar texto sin efecto sobre ciclo ya Pendiente, repetir no-op y después cambiar importe | Primeros casos conservan dirty_desde/ultimo/motivos sin dirty_reiterado; cambio real actualiza último y agrega evento; materialidad no consulta huella humana para marcar. |
| **AC-12** | Corregir errata de Concepto sin alterar clasificación/flujo | Preview material=false, sin marca ni reiteración; no exención por nombre de campo. |
| **AC-13** | Cambiar Concepto junto a Partida/categoría efectiva | Impacto por atribución medido, advertencia y Pendiente; ningún consumidor clasifica fuera de resolución de dominio. |
| **AC-14** | Renombrar cuenta/Partida/Instrumento con ID estable y cambiar nota | No marca si universo material no cambia; informes reflejan nombre vigente. |
| **AC-15** | Abono tardío vinculado a compra anterior | GRE del ciclo de compra y stock a Fin afectados exactamente según oráculo; no gasto negativo del cobro ni DO ficticia; contrato #538. |
| **AC-16** | Traspaso entre cuentas propias con mismo total/atribución/posiciones | Sin marca por composición; detalle por cuenta cambia y se mantiene visible. |
| **AC-17** | Fuente pasa a Parcial/NoDisponible sin cambio de cifra | Cambia cobertura, no marca; nunca se publica completa. Si no puede medirse impacto requerido, error explícito, no falsa igualdad. |
| **AC-18** | Cambio de saldo a Fin que alcanza varios ciclos | Marca exactamente digests antes/después distintos, motivos BALANCE_FIN y preview concordante. |
| **AC-19** | Confirmar escritura sin efecto material en ciclos limpios y pendientes | Ninguna marca/reiteración ni nuevos motivos; las marcas previas permanecen intactas. |
| **AC-20** | Operación material sobre Validada | dirty=1, primer/último instante y motivos; revisión y referencia humana invariantes. |
| **AC-21** | Cambio material y reversión exacta | impactoOperacion=true en ambas operaciones; divergencia final Igual, Pendiente permanece; evento reversion y atributo pendienteSinDelta, nunca cuarto estado. |
| **AC-22** | Confirmar revisión pendiente | Única limpieza humana: revisión +1 y referencia actual; tres estados visibles de §2, motivo/cobertura y auditoría. |
| **AC-23** | Revisar un ciclo con otros pendientes | No altera revisión, huella ni dirty de los demás. |
| **AC-24** | Segundo cambio material en ciclo Pendiente con referencia comparable o no | Conserva primer instante, actualiza último/motivos, dirty_reiterado solo por impacto real; no depende de divergencia acumulada. |
| **AC-25** | UPDATE/DELETE de auditoría y revisiones  r-1, r, r+1, r+2 | Auditoría inmutable; marcar mantiene r; revisión humana exige exactamente r+1; disminución y salto r+2 fallan en triggers nuevos, no en el antiguo trigger de monotonía. |
| **AC-26** | Validar sin siguiente Inicio, sin S0, sin backup y con E3.5 ausente | Primeras dos condiciones bloquean; backup no es criterio financiero pero G5 permanece gate; E3.5 parcial requiere motivo y no bloquea por sí sola. |
| **AC-27** | Abrir precontrol y contrastar todos sus bloques | Mantiene ventana/S0/movimientos/plan/inversión/E3.5/E3.6/integridad/cobertura; solo lectura, sin autoridad de backup/fotos para validar. |
| **AC-28** | Periodo con fuentes parciales y magnitud sin regla aditiva | COBERTURA_PARCIAL, total null donde no haya regla, nunca completa ni suma de stock. |
| **AC-29** | Fuente caída, periodo vacío y cero real acreditado | Distingue NoDisponible, SIN_CICLOS_EN_PERIODO y cero real; no rellena ausencias. |
| **AC-30** | Ciclo/trimestre/año del ámbito financiado | Mismo conjunto de hechos por pertenencia; flujos reconcilian, stock NO_ADITIVO con corte explícito. |
| **AC-31** | Fixture §6.3: compra diciembre en ciclo financiado enero | q pertenece a GRE natural 2026 y financiado 2027; etiquetas/DTO distinguen informes; no igualdad entre ejercicios ni tercer informe anual. |
| **AC-32** | Sumar trimestres por ámbito y reconciliar con anual del mismo ámbito | Exactitud en céntimos, tolerancia cero; no comparar anual financiado y natural como si fueran iguales. |
| **AC-33** | Consultar trimestre/año financiado sin ciclos | SIN_CICLOS_EN_PERIODO y total null; no cero inventado. |
| **AC-34** | Fixture §6.3 con devolución tardía; crear D y después desplazar C sin cruzar vecinos | Oráculo independiente reconcilia ventanas, stock, GRE natural/financiado y enlace a compra anterior. Toda diferencia legítima explicada, incluso ciclo anterior; candidato sin impacto no marca. |
| **AC-35** | Crear siguiente Inicio sin rectificar los existentes | mes_financiado de ciclos previos no cambia; puede cambiar Fin/cobertura y dependencias según oráculo, no cifras espurias. |
| **AC-36** | Preview de Inicio corregido dentro de vecinos, con q/d en tramo movido | Muestra corregido y predecesor, sucesor fijo, movimientos/revisiones reasignados y efectos indirectos; cancelar no escribe. |
| **AC-37** | Confirmar Inicio y alterar previamente contexto en segunda pestaña | Motivo/auditoría/idempotencia del ciclo; contexto cambiado da 409 sin hecho, capacidad ni marca. |
| **AC-38** | Inicio duplicado, fuera de vecinos, mes financiado ocupado o ID distinto | Rechaza integridad aun con confirmación; no se permite cruzar sucesor para cambiar su ventana. |
| **AC-39** | Corregir S0 del ciclo validado | Preview recursos/arrastres, motivo y Pendiente S0_CICLO; no reasigna movimientos y solo propaga dependencias reales. |
| **AC-40** | Reasignar por desplazamiento válido de Inicio | IDs/fechas/importes de hechos intactos, solo pertenencia derivada cambia y preview la enumera. |
| **AC-41** | Inventario de Anticipos antes/después y alcance #548 | Dato declarado y evidencia/procedencia/auditoría preservados por G8; no sustituir por pendiente actual ni borrarlo como foto financiera. |
| **AC-42** | Reanclaje A X→Y→X, intentar reutilizar evento histórico X→Y | Dos primeras operaciones válidas incrementan revisiones; evento viejo sin capacidad vigente falla; nuevo intento/revisiones autoriza; mismo intento idempotente no reescribe. |
| **AC-43** | Reacreditación B e inyección de fallo en cada paso de §4.3 | Sin evidencia falla; con evidencia orden evento/capacidad→ciclo→apertura→invariantes→consumo; rollback sin parciales; actualizar apertura primero o usar revisión obsoleta falla. |
| **AC-44** | Consumidores después de reanclaje/reacreditación | Corte final coincide con Inicio, protectAnticipoChange usa nuevo corte, anticipoRevision cambia y dependencias reales siguen bloqueando. |
| **AC-45** | Migrar copia v31 con fotos legibles, distintas e iguales por total | Todos los cierres legados nuevos Pendiente, cero validaciones limpias inventadas; referencia nueva null y procedencia fiel; repetición no duplica ni sobrescribe fila humana. |
| **AC-46** | Fotos ilegibles/incompletas/ausentes y ciclos sin ventana válida | Pendiente con causa, sin cifras inventadas ni falsa huella humana; incoherencia impide activación hasta resolver con evidencia. |
| **AC-47** | Migrar reapertura activa y vínculos origen→destino | Identidades/puntero activo/versiones/correlaciones preservados en eventos permitidos antes de borrar; conteos y relaciones reconciliados, ciclo activo Pendiente. |
| **AC-48** | Migrar periodos históricos y metadatos, repetir transformación | Conserva identidad/componentes/procedencia, no estado validado de periodo ni igualdad foto/vivo no demostrada; recibos evitan duplicación. |
| **AC-49** | Tras validaciones humanas nuevas, cambiar a R32 y probar C31 sobre copia v32 | R32 arranca/lee estados exactos y retira funciones incompatibles; C31 rechaza sin mutar. Ninguna UI muestra Sin validar por ignorar tabla; si falta R32 parada explícita, no rollback declarado funcional. |
| **AC-50** | Round-trip export→DROP en copia→recrear→restore, repetir restoreId | Filas originales idénticas y auditoría original intacta, más único evento restauracion global; dirty preservado, secuencias/correlaciones/idempotencia verificadas; G3/G7. |
| **AC-51** | Restaurar backup pre-v32 con export humano posterior disponible | Transformación conservadora, reconciliación explícita de hechos y validaciones posteriores; no abrir servicio mientras falten identidades/hechos; no perder validaciones recientes ni limpiar dirty. |
| **AC-52** | Probar matriz de rutas retiradas, API/UI y esquema ausente | 410 según §7.6, sin 500 ni alias de escritura simulada; validaciones[] y UI coordinadas; sin tabla/contrato 503 por G4, nunca Sin validar ni escritura fail-open. |
| **AC-53** | Medir informes y preview con histórico sintético >12 meses | p50/p95 y presupuesto registrados; exactitud intacta y caché solo tras evidencia con invalidación completa. |
| **AC-54** | Preview y confirmación sin cambios intermedios | Antes/después del preview coincide campo a campo con resultado real; no persiste preview/intent/contador en dry-run; G3/G9. |
| **AC-55** | Cambiar hechos, clasificación, validación o maestro entre preview y confirmar | 409 IMPACT_CHANGED y cero efectos; exige preview renovado. |
| **AC-56** | Dos claves distintas y mismo contexto: validar versus rectificar concurrentemente | Una gana; otra detecta revisión/impacto obsoleto sin confirmar silenciosamente. Caso separado misma clave+payload cumple AC-10, no conflicto artificial. |
| **AC-57** | Fallo inducido en hecho, marca, evento, autorización y recibo | Rollback total; ninguno queda parcial y próximo intento puede ejecutar correctamente; G9. |

### 9.1 Consolidación de AC anteriores (sin pérdida de garantía; IDs retirados históricos, destinos en v3)
| AC que deja de ser criterio independiente | Destino normativo / cobertura ejecutable |
| --- | --- |
| AC-06 | Plan de pruebas completo §10 y aceptación de incrementos |
| AC-07 | G1 y AC-05/AC-52 |
| AC-09, AC-10 | G3 y DTO §2; AC-09/AC-50/AC-54, incluyendo JSON y todos los escritores |
| AC-16 | G1/G4, retirada funcional §7.6 y AC-11/AC-13/AC-52 |
| AC-30 | G2 y AC-04 |
| AC-33 | G11 y AC-09/AC-26/AC-28 |
| AC-34 | G5 y gate operativo de I1/I3 |
| AC-36 | §5 y AC-26/AC-27/AC-52 |
| AC-54, AC-55, AC-56 | G2/G4 y AC-04/AC-38/AC-52 |
| AC-57, AC-58 | G4/G8, §7.6 y AC-41/AC-44/AC-47/AC-50 |
| AC-66 | G5/G6 y ensayo obligatorio I1/I3 |
| AC-68 | Contrato de retirada §7.6 y AC-52 |
| AC-69 | Verificación por incremento §10; diferencias por oráculo AC-34/AC-45/AC-48 |
| AC-71 | G1 y AC-05/AC-52 |
| AC-72 | I4 y matriz de supersesión §8, aprobación humana obligatoria |

## 10. Pruebas, evidencia, riesgos y límites

### Pruebas a implementar después de autorización DEV
| Grupo | Evidencia / aceptación |
| --- | --- |
| Esquema/DTO | Contratos exactos v31→v32 y recuperación, inserciones SQL adversariales, JSON anidado, inventario completo de escritores |
| Transformación | Todos los casos de §7, cero limpias por inferencia, metadatos activos/vínculos, repetición con fila humana |
| Impacto | Antes/después independiente de referencia, Pendiente+no-op, cambio conjunto, reiteración, reversión, atribución Concepto |
| Anticipos | A/B, X→Y→X, permiso viejo, fase incorrecta, revisiones concurrentes y rollback de cada paso |
| Informes | Dos ámbitos anuales; fixture §6.3, abono después de D, cobertura parcial y stocks no aditivos |
| Concurrencia | Procesos independientes, validar↔rectificar, claves distintas y reintentos idénticos; stale preview, busy sin efectos |
| Recuperación | Matriz binario↔contrato, R32 real arrancado en copia, backup/restore íntegro, originales más evento único |
| API/UI | 410/503, tres estados y atributos, cancelación, borrador en conflicto, teclado/foco y tamaños 390/1440 |
| Global | `python3 scripts/verify --full` por incremento; perfiles según CI; no puertos 3001/5173 en esta tarea documental |

El oráculo independiente enumera compras, enlaces y fechas/cortes con aritmética exacta, sin llamar al agregador ni digest bajo prueba; compara por cada informe, no una identidad derivada de la misma fuente contaminada.
Antes de aceptar incremento: QA independiente sobre implementación real, trazabilidad AC/Garantía→prueba→resultado; no basta compilar ni buscar cadenas.
Riesgos: coste de candidatos históricos; cascada legítima de stock; diferencias de neteo heredadas; una ruta fuera del funnel; autorización SQL incompleta; rollback sin binario compatible; auditoría con JSON permisivo.
Mitigación: evidencia sintética, snapshots consistentes, oráculos, inventario de escritores/lectores, contrato estricto y gates de recuperación; no añadir nuevos motores para ocultar carencias.
**UNRUN:** todos los AC, migraciones, triggers, dry-run bun:sqlite, enforcement JSON, oráculo de integración, R32/R33, backup, restauración y rendimiento. Ningún dato real ni Excel inspeccionado. No hay implementación ni afirmación de PASS.
**Verificado en esta entrega:** fuentes documentales completas, HEAD/rama, restricciones actuales de arranque (`schema-contract.ts`), puntero/vínculos E4.10 y mecanismo de guard de ciclo. No prueba ejecución de lo propuesto.
**Pendiente del coordinador:** revalidar Status del Project (CLI falló y GraphQL sin cuota), revisión independiente de este borrador y aprobación humana antes de publicación; DEV y #548 siguen gates separados.

## Respuesta a la revisión

La numeración siguiente sigue los doce puntos del encargo; el hallazgo de lista blanca de la revisión publicada se incorpora en el punto 2, y sus dos errores de AC en el punto 9.

| Hallazgo | Corrección aplicada / decisión técnica | Contrato y AC |
| --- | --- | --- |
| 1 · Impacto confundido con divergencia | Antes/después mismo conjunto gobierna; referencia humana solo diagnóstica triestado; no-op en Pendiente no reitera | §3; AC-07/AC-11/AC-19/AC-20/AC-21/AC-24 |
| 2 · Cifras persistidas y listas negras insuficientes | Preview solo memoria; lista blanca exacta recursiva, DB+servicio, inventario y pruebas de todos los escritores; recibos sin cifras | G3, §2; AC-09/AC-50/AC-54 |
| 3 · E1b valida por digest no comparable | Elección conservadora: todos legados Pendiente con procedencia, referencia humana nueva null; cero limpias supuestas | §7.2; AC-45/AC-46/AC-48 |
| 4 · Dos ejercicios incompatibles | Informe financiado por ciclos y económico natural, techo de dos; sin igualdad cruzada; contrato #538 en corrección paralela, sin cifras/recuentos de su matriz | G10, §6; AC-31/AC-32/AC-34 |
| 5 · Rollback no funcional con binario anterior | Matriz código↔esquema; R32 lector compatible probado, funciones inseguras retiradas; C31 rechaza, si no hay R32 parada, no falsa lectura | G7, §7.4/7.5; AC-49/AC-51 |
| 6 · Autorización reutilizable y orden equivocado | Capacidad por intento+revisiones y fases; evento/capacidad→ciclo→apertura→invariantes→consumo; historia no autoriza | §4.3; AC-42/AC-43 |
| 7 · Sucesor imposible por cronología | Corregido+predecesor directos; sucesor fijo, otros solo por dependencia medida; reasignación dentro de vecinos | §3.3/4.1; AC-34/AC-36/AC-38/AC-40 |
| 8 · Puntero y relaciones descartados | Migración explícita de reapertura_activa y cierre_vinculos con IDs/versiones/correlación, reconciliada antes de borrar | G8, §7.3; AC-47/AC-48 |
| 9 · AC-25 y AC-50 contradictorios | Trigger nuevo distingue marcar r y revisión humana r+1; round-trip conserva originales más evento único, no auditoría total idéntica | §2.4/7.5; AC-25/AC-50 |
| 10 · Diferencias legítimas por devolución tardía | Oráculo independiente en ventana desplazada y creación siguiente Inicio; GRE compra anterior y stock/cobertura explicados, no veto a cambios anteriores | §6.3; AC-15/AC-34/AC-35 |
| 11 · Competencia vs idempotencia | Claves distintas validar↔rectificar compiten; misma clave+payload resuelve recibo antes de comprobar revisión obsoleta | §3.4; AC-10/AC-56 |
| 12 · Etapas/AC/estados excesivos | Cuatro incrementos compatibles; transformación sin rollback propio; garantías consolidadas, IDs estables; tres estados, pendienteSinDelta atributo | §1/2/7/9.1; AC-04/AC-21/AC-22 |

Se mantienen expresamente Anticipos como negocio, backup como gate, dirty no bloqueante con limpieza humana y conservación de migraciones/contratos antiguos. No se rechaza ningún hallazgo.

## Reconciliación de interfaces

Código IMPACT_CHANGED y precedencia §1; estados/proyección §3. AC de conflicto antiguo 74→55; numeración compactada sin pérdida (57 AC). Referencias de limpieza: AC-04/21/22 (antes 04/26/27).

Fuente compartida: [anexo de interfaces](38-e49b-cierre-validacion-interfaces.md). Cambios limitados a los trece hallazgos y referencias afectadas; no modifica decisiones ajenas, no publica ni autoriza ejecución. Todos los AC permanecen UNRUN.

Mapeo de criterios activos v2 → v3 (solo renumeración salvo conflicto):

AC-01 → AC-01; AC-02 → AC-02; AC-03 → AC-03; AC-04 → AC-04; AC-05 → AC-05; AC-08 → AC-06; AC-11 → AC-07; AC-12 → AC-08; AC-13 → AC-09; AC-14 → AC-10; AC-15 → AC-11; AC-17 → AC-12; AC-18 → AC-13; AC-19 → AC-14; AC-20 → AC-15; AC-21 → AC-16; AC-22 → AC-17; AC-23 → AC-18; AC-24 → AC-19; AC-25 → AC-20; AC-26 → AC-21; AC-27 → AC-22; AC-28 → AC-23; AC-29 → AC-24; AC-31 → AC-25; AC-32 → AC-26; AC-35 → AC-27; AC-37 → AC-28; AC-38 → AC-29; AC-39 → AC-30; AC-40 → AC-31; AC-41 → AC-32; AC-42 → AC-33; AC-43 → AC-34; AC-44 → AC-35; AC-45 → AC-36; AC-46 → AC-37; AC-47 → AC-38; AC-48 → AC-39; AC-49 → AC-40; AC-50 → AC-41; AC-51 → AC-42; AC-52 → AC-43; AC-53 → AC-44; AC-59 → AC-45; AC-60 → AC-46; AC-61 → AC-47; AC-62 → AC-48; AC-63 → AC-49; AC-64 → AC-50; AC-65 → AC-51; AC-67 → AC-52; AC-70 → AC-53; AC-73 → AC-54; AC-74 → AC-55; AC-75 → AC-56; AC-76 → AC-57.
