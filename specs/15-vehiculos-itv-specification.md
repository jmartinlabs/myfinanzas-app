# 15 — E3.3 Vehículos y control ITV: Specification
Status: **DRAFT rev4** — Q1–Q6 confirmadas; specification y wireframes pendientes de
aprobación.
Approval source/date: Q1–Q5, usuario, 2026-10-26; Q6-A, usuario, 2026-10-26.
Aprobación de esta revisión: PENDING. Esta propuesta no autoriza desarrollo15, SQL,
datos reales, push de publicación ni merge.
QA source: segundo informe de QA independiente sobre el SHA `616f4ff`. Historial:
rev1 `4d037cd`; rev2 corrige H1–H6; rev3 incorpora Q6-A; rev4 corrige F1–F6 sin
reabrir Q1–Q6.
Context and brainstorming: [15-vehiculos-itv-brainstorming.md](15-vehiculos-itv-brainstorming.md),
[roadmap E3.3](roadmap.md), [R4/P2](functional-reference-v5.11.md).
Base: `f0a5219b2193283a4e3254d13c87c75c9254e845`; rama `codex/spec15-vehiculos`.
Solo documentación y ejemplos ficticios; sin Excel real, bases ni credenciales.

## 1. Contexto y alcance
E3.3 permite consultar un vehículo mediante una ficha única asociada a su Referencia
de tipo Vehículo, mantener a mano la próxima ITV y la cita, y consultar el gasto del
año natural seleccionado a partir exclusivamente de los Gastos reales registrados en
Movimientos.

La Referencia (REFxxx) es la identidad estable. La ficha no crea un segundo maestro
de vehículos ni duplica hechos: solo conserva los datos propios que no pertenecen al
catálogo de Referencias. El gasto anual es un read model derivado; no se persiste un
total ni una tabla de hechos paralela.

**In:** ficha 1:1; alta atómica; conversión explícita desde Referencias; estados de
edición; matrícula opcional; próxima ITV y cita manuales; consulta por ejercicio
natural; cobertura al corte y cobertura anual separadas; estados de integridad;
duplicados con confirmación en servidor; renombrado; desactivación/reactivación
heredada; API protegida; wireframes 390/1440; validación, errores, auditoría y
criterios de aceptación.
**Out:** Base B/Compartidos; D5/Exterior; Comida; B3/Dev32; seguros personales como
módulo; activos inmobiliarios; marca/modelo/kilometraje; historial 1:N de ITV;
recordatorios o automatización externa; planificación/presupuesto; importación
histórica; módulo Navidad; implementación, SQL y merge.

## 2. Decisiones confirmadas Q1–Q6

### Q1 — Contenido mínimo
Ficha mínima con la Referencia como identidad estable, nombre visible, matrícula
opcional y fechas manuales. No se incorporan marca, modelo, combustible, kilometraje
ni seguro como datos de la ficha.

### Q2 — Fechas manuales
Próxima ITV y cita son dos fechas civiles independientes y opcionales; la cita puede
quedar vacía. Las fechas pasadas son válidas: «próxima ITV» es una etiqueta de control,
no una restricción de futuro. No hay historial 1:N, periodicidad calculada,
recordatorios ni avisos automáticos. La fecha de ITV no determina el ejercicio ni el
gasto anual.

### Q3 — Identidad, integridad y duplicados
Alta atómica de Referencia de tipo Vehículo + ficha 1:1. Una sola ficha por REF.
Sin unicidad global de nombre ni matrícula. Renombrar conserva ID, enlaces e historia.
No se cambia el Tipo eliminando o recreando automáticamente la ficha: las operaciones
incompatibles se bloquean y una conversión excepcional exige decisión explícita fuera
de esta entrega.

Precisión H1: se restituye la opción Q3 aprobada. Una REF **sin ficha** y sin hechos
puede convertirse a Vehículo mediante una operación explícita que cree la ficha en la
misma transacción. Una REF **con ficha** no cambia de Tipo; una REF usada por cualquier
Movimiento queda bloqueada por E1.5. No se añade una prohibición general nueva.

### Q4 — Gasto anual
Se calcula exclusivamente desde Gastos reales vigentes asociados a la REF y
pertenecientes al año natural seleccionado por su Fecha real. No se filtra por
Categoría/Partida ni se mezcla planificación. Si no puede garantizarse la integridad
histórica, se muestra cobertura parcial y subtotal registrado, nunca un total
completo inventado. Ausencia de datos no es cero comprobado.

### Q5 — Ejercicio
Selector explícito de ejercicio, inicializado al año natural actual. Sin arrastre
entre ejercicios. Los años futuros sin datos no se presentan como importes cero
verificados.

### Q6 — Aviso de duplicado al corregir matrícula (Q6-A confirmada)
Se aplica la misma detección, aviso y confirmación server-side que en el alta y el
renombrado también al **corregir la matrícula** de una ficha existente:
- se excluye la propia ficha de la comparación;
- no se solicita confirmación si la matrícula permanece sin cambios;
- si coincide con otra ficha, se exige confirmación explícita antes de guardar;
- los duplicados confirmados siguen permitidos; no se introduce unicidad global;
- se preservan ID, Referencia e historial de la ficha.

Precisión transversal: única fuente de verdad de Gastos en Movimientos; sin duplicar
hechos ni introducir maestros adicionales.

## 3. Compatibilidad con contratos aprobados
| Contrato | Relación | Conflicto |
| --- | --- | --- |
| P2 | REFxxx estable/único/inmutable; nombre editable; enlaces por ID. La ficha usa la REF como PK y no duplica el nombre como clave. | Ninguno. Se conserva. |
| E1.5 CAT009 | La Referencia de vehículo sigue siendo opcional en un Gasto. E3.3 habilita el Tipo y exige ficha cuando la REF es de tipo Vehículo. | Ninguno. No se convierte CAT009 en obligatoria ni se añade compatibilidad opcional nueva. |
| E1.5 cambio de Tipo (H1) | Se aplica Q3 aprobada: REF con ficha no cambia de Tipo; REF sin ficha y sin hechos puede convertirse a Vehículo creando la ficha atómicamente; REF usada por cualquier hecho se bloquea por E1.5. No hay borrado ni recreación automática. | Ninguno. La conversión con ficha fuera de E3.3 exige decisión explícita; no se propone una restricción general nueva. |
| E2.4 ejercicio/cobertura (H2/F1) | Se reutiliza el contrato de año natural, Fecha real, exclusión de anulados, `control`, `corte`, `hechos`, `subtotal registrado`, `procedencia`, `cobertura al corte`, motivos y cero verificable. Se distingue `cobertura anual`, que no se presume por el corte. | Ninguno. Q4 no se modifica: sigue siendo año natural, sin planificación y con parciales explícitos. |
| E3.1/E3.2 | Se reutiliza el patrón documentado de ficha 1:1, alta atómica, auditoría, revisión y no DELETE. | Ninguno. No se depende de su código, participantes, aportaciones ni Base B. |
| D5/Exterior | No se habilitan Transferencias Exterior ni aportaciones externas. | Ninguno. Las restricciones E1.5 se conservan. |
| Base B (E3.2) | No se usa CAT013, participantes, reparto ni motor de Compartidos. | No se detecta dependencia. Si apareciera una decisión pendiente de Base B, se devolvería como bloqueo. |

## 4. Integración Referencias/Movimientos (H3)

### 4.1 Catálogo de Referencias
- `referenceMapping` mantiene `CAT009 → Vehículo`; `operationalReferenceTypes`,
  el tipo `Reference` y el CHECK de `referencias` incorporan `Vehículo` para que el
  Tipo sea operativo sin reescribir filas existentes.
- `POST /api/referencias` es la única vía de alta. Si `tipo = Vehículo`, crea la
  Referencia y la ficha en la misma transacción, con los campos opcionales de vehículo.
  No existe una segunda ruta de alta ni un contador de REF alternativo.
- `PATCH /api/referencias/{REF}` actualiza nombre, estado, Tipo y, si procede, los
  campos de la ficha. La actualización de ficha y Referencia es atómica y auditada.
- La conversión de Tipo sigue Q3: con ficha se bloquea; sin ficha y sin hechos se
  permite hacia Vehículo creando la ficha; con hechos se bloquea por E1.5.
- `GET /api/referencias` admite el filtro `tipo=Vehículo`; la identidad y el nombre
  siguen siendo los de Referencias. El formulario «Nuevo vehículo» reutiliza
  `POST /api/referencias` con `tipo=Vehículo`; no hay un CRUD paralelo.
- `referenceUsage` conserva todos los Movimientos, incluidos anulados. La existencia
  de ficha es un bloqueo adicional de Tipo, no un hecho financiero.

### 4.2 Movimientos
- `validateReference` comprueba, para toda REF informada de tipo Vehículo, que exista
  su ficha. Un alta o rectificación de Movimiento con REF Vehículo sin ficha se rechaza
  (`422`, sin escritura).
- CAT009 sin REF sigue permitida. CAT009 con REF Viaje/Evento sigue sujeta a la
  compatibilidad opcional ya aprobada; no se endurece por nombre ni por matriz.
- Una REF inactiva no admite nuevos enlaces; los enlaces históricos se conservan.
- La rectificación hacia/desde una REF Vehículo se revalida por el mismo servicio y
  por la huella de contexto existente; no hay ruta SQL ni endpoint paralelo.
- Anular un Movimiento no borra la REF ni la ficha; deja de computar en el Gasto año.
- La lectura de un Gasto con REF Vehículo sin ficha no se repara: se marca integridad
  `Revisar` y se conserva el hecho original.

### 4.3 Gasto anual
- La fuente es `movement-ledger`/los Movimientos vigentes, con el mismo criterio de
  Fecha real y anulación. No se crea una tabla de Gastos de vehículo.
- La cobertura reutiliza el contrato de fuentes anuales de E2.4; no se duplica el
  criterio de año, corte o anulación.
- La ficha y la lista enlazan a los Movimientos canónicos; no editan importes, fechas
  ni Partidas.

### 4.4 Transición de E1.5-AC-11/E1.5-AC-18 (F2)
E1.5 conserva su historia y su PASS original; E3.3 no reescribe su specification ni su
testplan. La habilitación de Vehículo sustituye únicamente los estados que lo trataban
como Tipo E3 bloqueado.

| Criterio E1.5 | Estado original | Transición E3.3 | Límite que permanece |
| --- | --- | --- | --- |
| E1.5-AC-11 | Crear Viaje/Evento; tipos E3 y Navidad bloqueados | Vehículo pasa a operativo por alta atómica E3.3 o conversión explícita Q3; no ficha huérfana | Navidad sigue fuera; Anticipo/Compartido dependen de sus entregas; no se habilitan por analogía |
| E1.5-AC-18 | CAT012/CAT013 obligatorias; E3 opcional bloqueado; CAT009 sin REF válido | CAT009 sigue opcional; CAT009 con REF Vehículo exige ficha; CAT009 sin REF sigue válido | No se crea ficha de relleno; no se fuerza Vehículo; Anticipo/Compartido no se desbloquean |

La transición se prueba con AC-38. No se modifica E1.5 ni se declara completo su AC-31
global; solo se documenta el estado que E3.3 habilita.

## 5. Modelo de datos y contratos
Modelo lógico documental; sin DDL, versión de esquema ni migración ejecutada.

| Objeto | Datos persistentes | Garantías / límites |
| --- | --- | --- |
| `referencias` | REFxxx, nombre, Tipo `Vehículo`, Estado, revisión, UTC | Identidad y nombre según P2/E1.5. El Tipo `Vehículo` exige ficha. Sin DELETE. |
| `fichas_vehiculo` | `referencia` PK/FK única; `matricula` NULL; `proxima_itv` NULL; `fecha_cita` NULL; `revision`; `creado`/`actualizado` UTC | Una fila por REF de tipo Vehículo. Sin importes, estado manual ni total anual persistido. `matricula` sin índice único. |
| Auditoría de ficha | Reutiliza la tabla `audit` existente con entidad `ficha_vehiculo` | Append-only; cambios de matrícula/fechas con actor, UTC, revisión y antes/después. No duplica hechos financieros. |
| `reference_attempts` | Intento de alta de Referencia | Se reutiliza para el alta atómica de vehículo; no se crea un segundo contador ni maestro alternativo. |
| `movimientos` | Hechos existentes | Única fuente de Gastos. La ficha y el gasto anual solo leen; no copian importes, fechas ni Partidas. |
| Fuentes anuales E2.4 | `control`, `corte`, intervalos/histórico verificable | Se reutiliza el contrato de cobertura; E3.3 no inventa un corte ni suma histórico transitorio no instalado. |
| Gasto anual | No persistido | Read model derivado; `universo`, `control`, `corte`, `procedencia`, `coberturaAlCorte`, `coberturaAnual`, `totalAlCorte`, `totalAnual`, `subtotalRegistrado`, `ceroVerificado`, `motivo` y `gastos`. Sin tabla de totales ni de hechos. |

Reglas de integridad:
- `fichas_vehiculo.referencia` es única y apunta a una Referencia de tipo `Vehículo`.
- No se puede insertar una ficha para otro Tipo; no se puede crear una REF Vehículo sin
  ficha por la ruta normal de alta.
- Sin DELETE físico de ficha ni de REF. La baja funcional es la desactivación heredada.
- `matricula`, `proxima_itv` y `fecha_cita` son NULL o valores válidos; NULL no es `""`
  ni `0`.
- No se crea `marca`, `modelo`, `kilometraje`, `seguro`, `historial_itv` ni un catálogo
  global de vehículos.
- El Tipo de una REF con ficha no se modifica; no hay borrado/recreación automática.
  Una REF sin ficha y sin hechos puede convertirse a Vehículo con ficha atómica.
- Los importes se manejan en céntimos exactos; DTO como string decimal, nunca number
  flotante. Las fechas económicas son civiles ISO; UTC solo para auditoría técnica.

Persistencia y migración (contrato documental, sin DDL):
- La nueva ficha se añade en una versión de esquema posterior, con actualización
  transaccional y rollback ante fallo.
- Se preservan Referencias, Movimientos, auditorías, FK, índices y triggers existentes;
  no hay reseed, borrado ni recreación de datos.
- Los backups incluyen la nueva tabla y su auditoría; una versión desconocida se rechaza
  antes de mutar. Restaurar mantiene la revocación de sesiones de la política vigente.
- Sin datos reales, Excel ni migración operativa en esta entrega.

## 6. Gasto anual y cobertura (H2)

### 6.1 Universo
Para una REF y un ejercicio `YYYY`, es **Gasto elegible** todo Movimiento que cumpla:
- `tipo = Gasto`;
- no anulado;
- `referencia = REF` exactamente;
- `Fecha` civil entre `YYYY-01-01` y `YYYY-12-31`, inclusive.

No se filtra por Categoría, Subcategoría ni Partida: cualquier Gasto real vinculado a la
REF cuenta. No cuentan Ingresos, Transferencias, Amortizaciones de deuda, Presupuesto,
planificación, cuotas de plan, históricos transitorios no instalados ni importes
derivados de la fecha de ITV. Cada hecho cuenta una sola vez; una rectificación o
anulación reevalúa el hecho sin duplicarlo.

### 6.2 Contrato único E2.4
No se introduce una fórmula alternativa. Se reutiliza `annualExecution` de E2.4 y su
misma lista de hechos; todos los campos siguientes salen del mismo universo y del mismo
intervalo, sin recalcular por otra vía:

| Campo | Regla única |
| --- | --- |
| `universo` | `{inicio: "YYYY-01-01", fin: "YYYY-12-31"}`. |
| `control` | Intervalo de control de E2.4 o `null`; no se inventa. |
| `corte` | Corte efectivo de E2.4, limitado al fin del ejercicio; `null` si no es verificable. |
| `hechos`/`gastos` | Gastos elegibles de la REF dentro del año y del control/corte aplicable, según E2.4; cada uno una sola vez. `gastos` es la lista DTO de los mismos `hechos`, no otra fuente ni otro cálculo. |
| `subtotalRegistrado` | Suma exacta de `hechos`; es el `registrado` de E2.4. No se suman hechos fuera del control/corte ni se recalcula con otra fórmula. |
| `procedencia` | La procedencia de E2.4: `movimientos` instalado; `historico` `No instalado` en esta entrega; `intervalosHistoricos` vacío. Si en el futuro se instala un proveedor, se reutiliza y deduplica contra Movimientos. |
| `coberturaAlCorte` | `Verificable al corte`, `Parcial` o `No disponible`, exactamente la de E2.4. |
| `coberturaAnual` | `Completa` solo si `coberturaAlCorte = Verificable al corte` y `corte` alcanza el 31/12; `Abierta` si es el año actual, `coberturaAlCorte = Verificable al corte` y aún no alcanza fin de año; `No verificada` en cualquier otro caso de cobertura parcial/no disponible o pasado sin alcance; `Futura` si el año empieza después de hoy. No es una fórmula nueva: deriva del corte y de la cobertura al corte. |
| `totalAlCorte` | `ejecutado` de E2.4 si la cobertura al corte es verificable; en otro caso `null`. |
| `totalAnual` | Igual a `totalAlCorte` solo si `coberturaAnual = Completa`; en otro caso `null`. No se obtiene de una suma distinta. |
| `ceroVerificado` | `true` solo si `coberturaAlCorte = Verificable al corte` y `hechos` está vacío; en cualquier otro caso `false`. Es cero verificado **del intervalo cubierto al corte**, no un total anual; `totalAnual` sigue su propio campo. No se deduce de la ausencia de filas ni de un año futuro. |
| `hechosConocidos` | Número de elementos de `hechos`; no es un importe. |
| `motivo` | Causa legible de cobertura parcial/no disponible, procedente de E2.4; no inventa datos. |

### 6.3 Presentación y extremos
- **Cero verificado:** se muestra `0,00 €` con la etiqueta «verificado al corte» solo
  cuando `ceroVerificado = true`. No se presenta como total anual. Si el subtotal es 0
  pero la cobertura es parcial, se muestra «Sin Gastos registrados conocidos» y no un
  cero verificado.
- **Ausencia:** si no hay Gastos conocidos pero la cobertura no es verificable, se
  muestra «Sin Gastos registrados conocidos» o «No disponible», nunca un cero
  verificado.
- **Año futuro:** `coberturaAnual = Futura`, `totalAlCorte = null`, `totalAnual = null`,
  `ceroVerificado = false`; no se presenta como cero.
- **Cambio de ejercicio:** el selector recalcula solo con el nuevo año; no hay arrastre,
  saldo inicial, copia ni prorrateo. Un Gasto de diciembre pertenece a diciembre aunque
  su Ciclo sea de enero. La fecha de ITV no mueve ningún Gasto.
- **Renombrado o inactividad:** el ID de REF no cambia; el gasto anual histórico se
  conserva. Una REF inactiva no admite nuevos enlaces, pero su ficha y sus Gastos
  históricos siguen consultables.
- **Una sola fuente:** no se crea una tabla de Gastos de vehículo ni se copian hechos.
  La lista de Gastos del año enlaza a los Movimientos canónicos. Un histórico transitorio
  futuro deberá deduplicar contra Movimientos; E3.3 no lo consume en esta entrega.
- **Q4:** no entra en conflicto con E2.4. Q4 exige año natural y parciales explícitos;
  E2.4 aporta el ejecutado al corte. La UI distingue «Gasto al corte» de «Total anual».

## 7. Estados de integridad (H4)
La integridad es distinta del Estado de la Referencia (`Activa`/`Inactiva`), del aviso
de duplicado y de la cobertura anual.

| Estado | Condiciones | Lectura | Escritura |
| --- | --- | --- | --- |
| `OK` | Exactamente una ficha para una REF Vehículo; la ficha apunta a la misma REF; sin huérfanos ni duplicados. | Ficha y Gasto año normales. | Edición ordinaria permitida. |
| `Revisar` | REF Vehículo sin ficha (`FICHA_AUSENTE`); ficha con REF de otro Tipo (`REF_TIPO_INCORRECTO`); ficha duplicada (`FICHA_DUPLICADA`); ficha sin REF (`REF_AUSENTE`); Gasto con REF Vehículo sin ficha (`GASTO_SIN_FICHA`). | Se muestran REF, motivo y, si procede, Gasto al corte; no se crea ni repara nada. | Se bloquea la edición ordinaria de la ficha; las nuevas escrituras inválidas se rechazan. |
| `No disponible` | No se puede evaluar la integridad por error de fuente/DB. | Motivo visible; no se declara OK ni se inventan datos. | Sin escritura que presuma integridad. |

Reglas:
- `Revisar` no se convierte en `OK` por una lectura; no se genera ficha, no se borra ni
  se fusiona. La reparación excepcional exigirá un procedimiento explícito fuera de
  E3.3.
- Un Gasto real con REF Vehículo sin ficha sigue siendo un hecho de Movimientos: no se
  oculta ni se borra; se muestra la incidencia y el Gasto al corte si la fuente anual
  lo permite.
- Una ficha con REF de otro Tipo no se presenta como vehículo normal; se muestra como
  incidencia `Revisar` en la vista y en integridad, y no se computa como Gasto de
  vehículo.
- La lista de integridad es de solo lectura y enlaza a la REF y a los Movimientos.
- `POST`/`PATCH` impiden crear nuevas REF Vehículo sin ficha o nuevas fichas inválidas;
  las lecturas no reparan datos históricos.

Resolución única de lectura (F3):

| Caso | `GET /api/vehiculos/{REF}` | `GET /api/vehiculos/integridad` |
| --- | --- | --- |
| REF inexistente | 404 `NOT_FOUND` | No aplica |
| REF existente no Vehículo, sin ficha | 404 `NOT_VEHICLE` | No aplica: no es un vehículo |
| REF Vehículo sin ficha | 200 con `ficha: null`, `integridad: Revisar` (`FICHA_AUSENTE`) | Lista la incidencia |
| REF no Vehículo con ficha | 200 con ficha y `integridad: Revisar` (`REF_TIPO_INCORRECTO`) | Lista la incidencia |
| REF Vehículo con ficha única | 200 con `integridad: OK` | No la lista |
| Ficha duplicada detectada | 200 con `integridad: Revisar` (`FICHA_DUPLICADA`) | Lista la incidencia |
| Gasto con REF Vehículo sin ficha | 200 con `ficha: null`, `integridad: Revisar` (`GASTO_SIN_FICHA`) y Gasto al corte si procede | Lista la incidencia |

Así, un mismo caso no se responde a la vez con 404 y `Revisar`: el 404 queda reservado
para REF inexistente o no-Vehículo sin ficha; toda REF con ficha o Tipo Vehículo se lee
como 200 y su estado de integridad. `/api/vehiculos/integridad` solo enumera anomalías,
sin repararlas.

## 8. Confirmación de duplicados en servidor (H5, Q6-A)
- **Alcance confirmado:** alta de vehículo, renombrado de la Referencia y corrección de
  matrícula de una ficha existente. Se comparan nombre y matrícula; una coincidencia en
  cualquiera genera aviso. No hay unicidad global ni fusión.
- **Cálculo:** el servidor busca coincidencias por valor exacto o clave efímera de
  presentación (trim + minúsculas), incluyendo fichas activas e inactivas. La clave no
  se persiste ni altera el valor guardado. Al corregir una ficha se excluye su propia
  REF de la comparación.
- **Matrícula sin cambios:** si el valor enviado es igual al guardado, no se solicita
  confirmación por duplicado; la edición sigue su flujo normal de revisión.
- **Sin confirmación:** `409 DUPLICATE_WARNING` con `coincidencias` (REF, nombre,
  matrícula, estado) y `candidateHash`; no se escribe nada.
- **Confirmación server-side:** el cliente reenvía la operación con
  `confirmarDuplicado: true` y el `candidateHash` vigente. El servidor recalcula las
  coincidencias y solo escribe si el conjunto coincide; si cambió, devuelve 409.
- **`candidateHash`:** lo emite el servidor y liga, como mínimo, operación
  (`alta`/`renombrado`/`matrícula`), REF afectada o `null`, `revision`/`fichaRevision`
  aplicables, nombre/matrícula comparados y la lista ordenada de candidatos
  (`REF`, nombre, matrícula, estado). No es una firma de seguridad ni un token de
  autorización; es un control de contexto obsoleto. No se guarda como fuente financiera.
- **Validación del hash:** en la confirmación de un aviso ya emitido, si falta
  `candidateHash`, no es string hexadecimal válido o llega con `confirmarDuplicado`
  falso, se rechaza con 422 y no se escribe. Si el hash no coincide con el recalculado,
  se devuelve `409 DUPLICATE_CONTEXT_CHANGED` y no se escribe. El servidor nunca acepta
  una lista de candidatos enviada por el cliente.
- **Repetición:** un 409 de aviso o contexto no se registra como éxito. La confirmación
  forma parte del payload idempotente; un reintento confirmado no duplica la REF/ficha
  ni crea otra ficha.
- **Duplicados confirmados:** siguen permitidos; no se crea una restricción de unicidad
  global. Se conservan ID, Referencia e historial de la ficha.
- **Auditoría:** se registra `duplicado_confirmado` con el hash de candidatos y la
  revisión, sin duplicar importes ni hechos.

## 9. Pantallas y wireframes (H6)
Datos ficticios. Se reutiliza el shell, tokens, tablas/tarjetas, foco y componentes
existentes. La aprobación visual no acredita implementación ni pruebas de navegador.
W1, W2, W5, W7 y W9 son 1440; W3, W4, W6, W8 y W10 son 390.

Mapeo etiqueta UI ↔ contrato, para evitar una segunda fórmula o nombres divergentes:

| Etiqueta UI | Campo/regla |
| --- | --- |
| Ejercicio | `universo` y selector explícito |
| Control / Corte | `control` / `corte` |
| Procedencia | `procedencia` |
| Subtotal registrado | `subtotalRegistrado` (suma de `hechos`) |
| Cobertura al corte | `coberturaAlCorte` (`Verificable al corte` se abrevia «Verificable» en tablas estrechas) |
| Total al corte | `totalAlCorte` |
| Cobertura anual | `coberturaAnual` |
| Total anual | `totalAnual` |
| Cero verificado | `ceroVerificado` |
| Gastos del año (N) | `gastos` = `hechos`; N = `hechosConocidos` |

### W1 — Listado de vehículos (1440)
```text
Vehículos · Ejercicio [2026 v]                         [+ Nuevo vehículo]
Control 01/01–30/06/2026 · Corte 30/06/2026 · [Ver procedencia]
Cobertura al corte: Verificable · Cobertura anual: Abierta

REF      Nombre           Matrícula    Próx. ITV   Cita        Subtotal reg.  Cob. corte   Total al corte  Cob. anual    Total anual    Integridad  Estado
REF1001  Coche principal  1234 ABC     12/09/2026  20/08/2026  1.240,00 €     Verificable  1.240,00 €     Abierta       No disponible  OK          Activa
REF1002  Moto             5678 DEF     No informada —          0,00 € verif.  Verificable  0,00 €          Abierta       No disponible  OK          Activa
REF1003  Furgoneta        Sin informar 03/03/2027  10/01/2025  No disponible  No disponible No disponible  No verificada No disponible  Revisar     Inactiva
```

«Gasto al corte» es el `subtotalRegistrado`; no es el total anual. REF1002 es el único
cero verificado del ejemplo; REF1003 no es cero. La cita de REF1003 es una fecha pasada
válida y se muestra sin normalización.

### W2 — Ficha de vehículo (1440)
```text
‹ Volver   REF1001 · Coche principal                              [Activa]
Identidad estable: REF1001 (no editable)
Nombre: [Coche principal]  Matrícula: [1234 ABC]  [Editar ficha]
Próxima ITV: [12/09/2026]  Cita: [20/08/2026]
Fechas manuales e independientes; la cita puede quedar vacía.
Integridad: OK

Gasto año [2026 v]
Control 01/01–30/06/2026 · Corte 30/06/2026 · [Ver procedencia]
Cobertura al corte: Verificable · Cobertura anual: Abierta
Subtotal registrado: 1.240,00 €
Total al corte: 1.240,00 €
Total anual: No disponible · Cero verificado: No

Gastos del año (3)                                      [Ver en Movimientos]
Fecha        Concepto                 Partida             Importe
15/02/2026   Mantenimiento            PAR101 · Coche      120,00 €
20/06/2026   Seguro                   PAR102 · Coche      400,00 €
30/06/2026   Combustible              PAR103 · Coche      720,00 €

Historial de la ficha: [Ver auditoría]
```

Una fecha pasada (por ejemplo, ITV 10/01/2025) se muestra tal cual; no se bloquea,
normaliza ni sustituye por hoy.

### W3 — Listado de vehículos (390)
```text
Vehículos [2026 v]                         [+ Nuevo]
Control 01/01–30/06/2026 · Corte 30/06/2026
Procedencia: Movimientos; histórico no instalado.
Cobertura al corte: Verificable · anual: Abierta

REF1001 · Coche principal [Activa]
1234 ABC · Próx. ITV 12/09/2026 · Cita 20/08/2026
Subtotal registrado 1.240,00 € · Cob. corte Verificable
Total al corte 1.240,00 € · Cob. anual Abierta
Total anual No disponible · Cero verificado: No · Integridad: OK

REF1002 · Moto [Activa]
5678 DEF · Próx. ITV No informada
Subtotal registrado 0,00 € verificado al corte · Cob. corte Verificable
Total al corte 0,00 € · Cob. anual Abierta
Total anual No disponible · Cero verificado: Sí · Integridad: OK
Procedencia: Movimientos; histórico no instalado.

REF1003 · Furgoneta [Inactiva]
Sin matrícula · Próx. ITV 03/03/2027 · Cita 10/01/2025 (pasada)
Subtotal registrado No disponible · Cob. corte No disponible
Total al corte No disponible · Cob. anual No verificada
Total anual No disponible · Cero verificado: No · Integridad: Revisar
```

### W4 — Ficha de vehículo (390)
```text
‹ Volver  REF1001 · Coche principal [Activa]
Matrícula: 1234 ABC
Próxima ITV: 12/09/2026
Cita: 20/08/2026
[Editar ficha]
Integridad: OK

Gasto año [2026 v]
Control 01/01–30/06/2026 · Corte 30/06/2026
Cobertura al corte: Verificable · anual: Abierta
Subtotal registrado: 1.240,00 €
Total al corte: 1.240,00 € · Cero verificado: No
Total anual: No disponible · [Ver motivo y procedencia]
[Ver Gastos del año]
[Historial de la ficha]
```

### W5 — Alta / edición (1440)
```text
Nuevo vehículo · Tipo: Vehículo (fijo)
Nombre *                 [________________________]
Matrícula (opcional)     [________________________]
Próxima ITV (opcional)   [__/__/____]
Cita (opcional)          [__/__/____]
La cita puede quedar vacía. No se calcula periodicidad ni se envían avisos.

[!] Coincidencias revisables:
    REF1001 · Coche principal · 1234 ABC · Activa
    Son vehículos distintos: [Confirmar y crear]  (candidateHash vigente)

[Cancelar] [Crear vehículo]
Al confirmar se crean REF + ficha en una única transacción; un fallo revierte todo.

EDITAR VEHÍCULO · REF1001 · revisión REF 3 · revisión ficha 2
Nombre [Coche principal]  Matrícula [1234 ABC]
Próx. ITV [12/09/2026]  Cita [20/08/2026]
Fechas pasadas permitidas; se muestran tal cual.
[!] Si cambia nombre o matrícula y coincide con otra ficha:
    REF1002 · Moto · 5678 DEF · [Confirmar y guardar] (candidateHash)
La propia ficha no es candidata; matrícula sin cambios no pide confirmación.
[Cancelar] [Confirmar y guardar]
```

### W6 — Alta / edición (390)
```text
Nuevo vehículo · Tipo Vehículo (fijo)
Nombre *        [________________]
Matrícula       [________________]
Próx. ITV      [__/__/____]
Cita            [__/__/____]
Cita vacía permitida; sin avisos automáticos.

[!] Coincidencias:
REF1001 · Coche principal · 1234 ABC
[Confirmar y crear]  (candidateHash)

[Cancelar] [Crear vehículo]
Alta atómica; fallo = rollback.

EDITAR · REF1001 · rev. REF 3 · rev. ficha 2
Nombre [Coche principal] · Matrícula [1234 ABC]
Próx. ITV [12/09/2026] · Cita [20/08/2026]
Fechas pasadas permitidas.
[!] Coincidencia al cambiar nombre/matrícula:
    REF1002 · Moto · 5678 DEF
    [Confirmar y guardar] (candidateHash)
La propia ficha no es candidata; sin cambio de matrícula no hay aviso.
[Cancelar] [Confirmar y guardar]
```

### W7 — Integridad y cobertura (1440)
```text
Integridad de vehículos · Ejercicio 2026
[Revisar] REF1004 · Vehículo sin ficha · Gasto al corte 120,00 €
    No se crea ni repara automáticamente. [Ver REF] [Ver Movimientos]
[Revisar] Ficha REF1005 · REF de tipo Viaje · No es un vehículo
    Se conserva el dato; sin acciones de borrado.
[No disponible] Cobertura al corte: No disponible · Cobertura anual: No verificada
    Control: No disponible · Corte: No disponible
    Procedencia: Movimientos; histórico no instalado.
    Subtotal registrado: 0,00 € · Cero verificado: No · Total anual: No disponible
```

### W8 — Integridad y cobertura (390)
```text
Integridad · 2026
[Revisar] REF1004 · Vehículo sin ficha
Gasto al corte 120,00 €
No se crea ni repara automáticamente.
[Ver REF] [Ver Movimientos]

Cobertura al corte: No disponible
Cobertura anual: No verificada
Control/Corte: No disponible
Procedencia: Movimientos; histórico no instalado.
Subtotal registrado: 0,00 €
Cero verificado: No · Total anual: No disponible
```

### W9 — Conversión desde Referencias (1440)
```text
REFERENCIAS · REF1007 · Viaje [Activa]                 [Cambiar Tipo]
Conversión a Vehículo
Impacto: REF1007 · Viaje → Vehículo; se crea ficha 1:1.
ID, nombre e historial se conservan; no se borra ni recrea una ficha.
Disponible solo si no tiene ficha y no tiene hechos (E1.5).
[ ] Confirmo la conversión explícita
Nombre [Coche secundario]  Matrícula [9012 JKL]
Próx. ITV [10/01/2025] (pasada válida)  Cita [ ]
[Revisar y convertir] [Cancelar]
Si ya tiene ficha o hechos: bloqueado con motivo; sin acciones automáticas.
```

### W10 — Conversión desde Referencias (390)
```text
REFERENCIAS · REF1007 · Viaje [Activa]
[Cambiar Tipo]
Convertir a Vehículo
Impacto: Viaje → Vehículo + ficha 1:1.
ID, nombre e historial conservados.
Solo sin ficha y sin hechos; si no, bloqueado.
Nombre [Coche secundario]
Matrícula [9012 JKL]
Próx. ITV [10/01/2025] (pasada válida)
Cita [ ]
[ ] Confirmo la conversión explícita
[Revisar y convertir] [Cancelar]
```

Notas comunes: la lista y la ficha muestran «No informada» para fechas ausentes; nunca
0. «Parcial»/«No disponible» no son cero. Las fechas pasadas son válidas y se muestran
sin normalización. No hay marca/modelo/kilometraje, recordatorios ni edición de
Movimientos desde la ficha.

## 10. Estados vacío, carga y error
- Listado sin vehículos: «Sin vehículos» + Nuevo vehículo; no filas ficticias.
- Ficha inexistente: 404 con mensaje accionable y vuelta al listado.
- Carga: estado visible; se conserva el ejercicio seleccionado y los filtros.
- Error de Movimientos o de la fuente anual: identidad/fechas siguen visibles; el gasto
  muestra «No disponible»/«Parcial», `control`, `corte`, `procedencia`, `cobertura
  anual` y motivo, sin borrar el resto.
- Error de fuente anual no se convierte en 0; no se oculta la cobertura.
- Conflicto de revisión, Tipo o integridad: 409; se conserva el borrador.
- Alta fallida: rollback completo; no hay REF ni ficha parcial.
- Duplicado sin confirmación: 409 con candidatos; confirmación explícita con
  `candidateHash`; no se fusiona ni se sobrescribe.
- Respuesta antigua: no sustituye un ejercicio/ficha seleccionados después.
- Sesión expirada: se conserva el borrador y se pide reautenticar sin exponer datos.
- Integridad `Revisar`: se muestra el motivo; no se ofrece reparación automática.
- Sin fechas: «No informada»; no 0, no fecha de hoy, no fecha de creación.

## 11. API y dependencias externas
Propuesta de contrato; las rutas y el esquema físico quedan sujetos al desarrollo
autorizado, sin crear maestros ni hechos paralelos.

| Método y ruta | Uso | Reglas |
| --- | --- | --- |
| `POST /api/referencias` | Alta única, incluida REF Vehículo + ficha | `tipo=Vehículo` crea ficha atómica; `vehiculo` opcional; idempotency-key; duplicado con confirmación; rollback. |
| `PATCH /api/referencias/{REF}` | Editar nombre, estado, Tipo y ficha | `revision` y `fichaRevision` cuando proceda; Q3 para Tipo; `vehiculo` solo cuando el Tipo resultante sea Vehículo; auditoría. |
| `GET /api/referencias?tipo=Vehículo` | Catálogo de Referencias | Filtro operativo; no escribe; identidad/nombre de Referencias. |
| `GET /api/vehiculos?ejercicio=YYYY&page=N` | Listado con ficha, integridad y resumen anual | Autenticado; paginación; no escribe; totales de la página completos. |
| `GET /api/vehiculos/{REF}?ejercicio=YYYY` | Ficha, integridad, coberturas y Gastos | 404 solo si la REF no existe o es no-Vehículo sin ficha; 200 con `Revisar` si la REF es Vehículo sin ficha o si existe ficha; no repara integridad. |
| `GET /api/vehiculos/integridad?ejercicio=YYYY` | Incidencias de integridad | Solo lectura; REF/ficha, motivo y, si procede, gasto al corte. |
| `POST /api/referencias/{REF}/desactivar` y `/reactivar` | Ciclo de vida heredado | Conserva ficha e historia; no DELETE; no crea hechos. |

No se añade `POST /api/vehiculos` ni un CRUD paralelo: el alta y la edición pasan por
Referencias, y `/api/vehiculos` es un read model de ficha + anual.

Cuerpos de escritura propuestos:
```json
POST /api/referencias
{"nombre": "Coche principal", "tipo": "Vehículo",
 "vehiculo": {"matricula": "1234 ABC", "proximaITV": "2026-09-12", "cita": null}}

PATCH /api/referencias/REF1001
{"revision": 1, "fichaRevision": 1, "nombre": "Coche principal",
 "vehiculo": {"matricula": "1234 ABC", "proximaITV": "2026-09-12", "cita": null},
 "confirmarDuplicado": false}

Confirmación de duplicado (misma operación):
{"confirmarDuplicado": true, "candidateHash": "<hash emitido por el servidor>"}
```

DTO de lectura propuesto:
```json
{
  "referencia": {"id": "REF1001", "nombre": "Coche principal", "tipo": "Vehículo", "estado": "Activa", "revision": 1},
  "ficha": {"matricula": "1234 ABC", "proximaITV": "2026-09-12", "cita": null, "revision": 1},
  "integridad": {"estado": "OK", "motivos": []},
  "gastoAnual": {
    "ejercicio": 2026,
    "universo": {"inicio": "2026-01-01", "fin": "2026-12-31"},
    "control": {"inicio": "2026-01-01", "fin": "2026-06-30"},
    "corte": "2026-06-30",
    "procedencia": {
      "movimientos": "Instalado; Gastos vigentes por Fecha real",
      "historico": "No instalado",
      "intervalosHistoricos": []
    },
    "coberturaAlCorte": "Verificable al corte",
    "coberturaAnual": "Abierta",
    "subtotalRegistrado": "1240.00",
    "totalAlCorte": "1240.00",
    "totalAnual": null,
    "ceroVerificado": false,
    "hechosConocidos": 3,
    "motivo": "Cobertura al corte verificable; año abierto sin total anual",
    "gastos": [{"id": "123", "fecha": "2026-06-30", "importe": "720.00", "partida": {"id": "PAR103", "nombre": "Combustible"}}]
  }
}
```

Reglas de API:
- Reutilizar MFA/sesión, Origin/CSRF, límites JSON, validación Effect Schema,
  revisiones, idempotencia y auditoría existentes.
- No hay endpoint de escritura directa de Movimientos ni de totales anuales.
- `GET` no escribe, no crea fichas para REF huérfanas y no repara integridad.
- Errores 404/409/422 sin SQL, payload financiero ni datos sensibles; no-store.
- La lista y la ficha declaran `universo`, `control`, `corte`, `procedencia`,
  `coberturaAlCorte`, `coberturaAnual`, `subtotalRegistrado`, `totalAlCorte`,
  `totalAnual`, `ceroVerificado` y `motivo`; null no se convierte en 0.
- Un cambio concurrente de Referencia, ficha o hechos invalida la revisión y devuelve
  409 sin escritura parcial.
- La confirmación de duplicado exige `confirmarDuplicado` y `candidateHash`; el servidor
  no confía en candidatos del cliente y revalida el contexto.
- No se habilitan rutas Exterior, Base B, Comida, B3/Dev32 ni fixtures de producción.

## 12. Validación y casos extremos
- **Nombre:** obligatorio, reglas de Referencia existentes (máximo 120, sin caracteres
  de control); se conserva el valor literal. Renombrar no cambia IDs ni enlaces.
- **Matrícula:** opcional; máximo 32 caracteres; sin caracteres de control; se conserva
  literal (sin uppercase ni eliminación silenciosa de espacios). No es única.
- **Fechas:** opcionales; ISO `YYYY-MM-DD` válida; pasadas y futuras son válidas, sin
  rechazo ni corrección automática; «próxima ITV» no impone futuro. No se calcula
  periodicidad, no se deriva una de otra, no se rellena con hoy. `null` limpia; PATCH
  omitido conserva. Cambios auditados.
- **Alta:** `tipo=Vehículo` crea REF + ficha; fallo en cualquier paso revierte ambas;
  reintento idempotente no duplica; dos procesos no crean dos fichas.
- **Tipo incorrecto:** ficha para Viaje/Evento/Anticipo/Compartido rechazada; `vehiculo`
  con Tipo no Vehículo rechazado.
- **Ficha duplicada:** unicidad por REF; 409/rollback; no segunda ficha.
- **Tipo Vehículo (Q3):** con ficha, cambio bloqueado; sin ficha y sin hechos, conversión
  explícita a Vehículo con ficha atómica; con hechos, bloqueo E1.5. No delete/recreate.
- **Integridad de lectura (F3):** REF inexistente o no-Vehículo sin ficha -> 404; REF
  Vehículo sin ficha, ficha con REF de otro Tipo, ficha duplicada o Gasto sin ficha ->
  200 con `Revisar` y motivo. Nunca se responde 404 y `Revisar` para el mismo caso; no
  se auto-repara.
- **Duplicados de nombre/matrícula:** coincidencia exacta o clave efímera (trim +
  minúsculas) solo para aviso; no se guarda la clave. Confirmación server-side con
  `candidateHash`; nunca fusión.
- **`candidateHash` (F4):** el servidor lo emite y lo revalida. Falta/formato inválido o
  `confirmarDuplicado=false` -> 422; hash que no coincide con el contexto recalculado ->
  409 `DUPLICATE_CONTEXT_CHANGED`; sin escritura. No se aceptan candidatos del cliente.
- **Matrícula en edición (Q6-A):** la corrección de matrícula usa la misma detección,
  aviso y confirmación server-side que el alta/renombrado; se excluye la propia ficha y
  no se pide confirmación si el valor no cambia. Si coincide con otra ficha, se exige
  confirmación explícita. Se conservan ID, Referencia e historial; no hay unicidad
  global.
- **Gasto año:** un Gasto de otra REF no cuenta; un Gasto con REF Vehículo y cualquier
  Partida sí cuenta; anulados no cuentan; rectificados reevalúan; no doble cómputo.
- **Cambio de ejercicio:** diciembre/enero y Ciclo distinto no arrastran; ITV no mueve
  el gasto; año futuro no es 0 verificado.
- **Cobertura (F1):** `control`, `corte`, `universo`, `procedencia`, `hechos`,
  `subtotalRegistrado`, `coberturaAlCorte`, `coberturaAnual`, `totalAlCorte`,
  `totalAnual` y `ceroVerificado` salen del mismo contrato E2.4, sin otra fórmula.
  `subtotalRegistrado` suma los `hechos` del intervalo; `totalAlCorte` es el ejecutado
  de E2.4; `totalAnual` solo repite `totalAlCorte` si la cobertura anual es completa;
  `ceroVerificado` solo es verdadero con cobertura al corte verificable y `hechos`
  vacío. Parcial no es cero; futuro no es cero.
- **Inactividad:** ficha e histórico visibles; no nuevos enlaces; reactivar no crea
  hechos.
- **Transición E1.5 (F2):** E3.3 habilita Vehículo; Navidad sigue bloqueada; CAT009 sin
  REF sigue válida; CAT009 con REF Vehículo exige ficha; no se desbloquean Anticipo ni
  Compartido por analogía.
- **Concurrencia:** revisión obsoleta 409; respuesta antigua no reemplaza el año nuevo.
- **Seguridad:** MFA/CSRF/Origin; sin DELETE; sin SQL/payload en logs; sin datos reales.

## 13. Exclusiones
Base B y Compartidos; D5/Exterior y aportaciones externas; Comida; B3/Dev32; seguros
personales como módulo; activos inmobiliarios; marca/modelo/kilometraje; historial
1:N de ITV; recordatorios, notificaciones o automatización externa; planificación,
Presupuesto o cuotas; importación histórica; módulo Navidad; SQL/DDL; desarrollo15;
datos reales; publicación o merge.

## 14. Criterios de aceptación
Diseño de prueba; ninguno ejecutado. Los positivos usan datos ficticios. La aprobación
de esta tabla no autoriza implementación.

| ID | Acción / precondiciones | Resultado observable esperado |
| --- | --- | --- |
| AC-01 | Alta de vehículo por `POST /api/referencias` con `tipo=Vehículo` | REF Activa y ficha 1:1 en una transacción; ID estable; sin huérfanos |
| AC-02 | Fallo en cualquier paso del alta; reintento con la misma clave | Rollback completo; sin REF/ficha parcial; reintento no duplica |
| AC-03 | Intentar ficha para REF no Vehículo o `vehiculo` con Tipo no Vehículo | Rechazo de tipo incorrecto; sin ficha creada |
| AC-04 | Intentar una segunda ficha para la misma REF, incluso en dos procesos | Una sola ficha; duplicado rechazado sin estado parcial |
| AC-05 | REF sin ficha y sin hechos; cambio explícito a Vehículo | Ficha creada atómicamente con el cambio; no se recrea ni elimina nada |
| AC-06 | Cambiar Tipo de una REF usada o que ya tiene ficha de Vehículo | Bloqueo por E1.5/ficha; ficha e historia intactas; sin borrado/recreación |
| AC-07 | Leer REF inexistente/no-Vehículo sin ficha; REF Vehículo sin ficha; ficha con REF de otro Tipo; ficha duplicada | 404 solo en los dos primeros; 200 con `Revisar` y motivo en los demás; sin auto-reparación ni escritura |
| AC-08 | Renombrar la Referencia | Mismo REFxxx, enlaces e historia; Gasto año sin cambio; auditoría |
| AC-09 | Crear/editar/limpiar matrícula opcional | Se conserva o queda «Sin informar»; sin unicidad global; auditoría |
| AC-10 | Crear/renombrar o corregir matrícula con coincidencia y sin confirmar | `409 DUPLICATE_WARNING` con candidatos y `candidateHash`; sin escritura; la propia ficha no aparece como candidata |
| AC-11 | Confirmar duplicado con `candidateHash` vigente; candidatos cambiados | Con hash vigente escribe y audita; si cambió, 409 sin escritura; no se crea unicidad global |
| AC-12 | Desactivar y reactivar una REF con ficha e historial | Ficha e historia conservadas; sin nuevos enlaces mientras inactiva; sin hechos nuevos al reactivar |
| AC-13 | Alta sin próxima ITV ni cita; después informar una sola | Ambas ausentes como «No informada»; independencia; la cita vacía es válida |
| AC-14 | Editar fechas pasadas/futuras, limpiar una y conservar la otra | Ambas válidas, incluidas pasadas; sin cálculo de periodicidad; PATCH omitido conserva; null limpia; auditoría |
| AC-15 | Varios Gastos con la REF, Partidas distintas | Todos cuentan una vez; suma exacta; sin filtro por Categoría/Partida |
| AC-16 | Gastos de otra REF, Ingresos, Transferencias, Amortizaciones, Presupuesto y anulados | No cuentan; no se mezcla planificación; originales intactos |
| AC-17 | Gasto de diciembre con Ciclo de enero; ITV en otro año | Pertenece al año de su Fecha real; la ITV no mueve el gasto; sin arrastre |
| AC-18 | Abrir ficha y cambiar el selector de ejercicio | Inicializa en el año natural actual; recalcula solo el año elegido; pasado/futuro consultables |
| AC-19 | Cobertura al corte parcial con hechos conocidos | `coberturaAlCorte=Parcial`, `control`/`corte`, `procedencia`, `subtotalRegistrado` y motivo; `totalAlCorte=null`; `totalAnual=null`; `ceroVerificado=false` |
| AC-20 | Cobertura al corte verificable pero año abierto | `totalAlCorte` verificado y `subtotalRegistrado` coincidente; `coberturaAnual=Abierta`; `totalAnual=null`; `ceroVerificado` solo si no hay hechos; no se declara total anual completo |
| AC-21 | Cobertura al corte verificable que alcanza el 31/12 del ejercicio | `coberturaAnual=Completa`; `totalAnual=totalAlCorte`; `procedencia` coherente; `ceroVerificado` solo si no hay hechos |
| AC-22 | Ejercicio verificable sin Gastos; año futuro sin cobertura | `ceroVerificado=true` al corte solo en el primero con `subtotalRegistrado=0`; el futuro tiene `ceroVerificado=false` y totales `null` |
| AC-23 | Rectificar o anular un Gasto vinculado | El Gasto año se recalcula una vez; el original se conserva; sin doble cómputo |
| AC-24 | Renombrar o desactivar la REF y consultar años anteriores | ID y totales históricos se conservan; no se reescriben hechos |
| AC-25 | Inspeccionar persistencia y fuentes del Gasto año | Solo Movimientos como fuente de Gastos; sin tabla de totales, hechos duplicados ni maestro alternativo |
| AC-26 | API sin sesión, sin CSRF, revisión obsoleta, payload inválido, replay o DELETE | Rechazo seguro; 404/409/422 sin datos sensibles; idempotencia, sin DELETE y sin escritura parcial |
| AC-27 | Cambio rápido de ejercicio/ficha con respuesta antigua | La respuesta antigua no sustituye la selección vigente; filtros y borrador se conservan |
| AC-28 | UI 390/1440 de listado, ficha, alta, edición, integridad, cobertura y conversión | Etiquetas completas, foco/teclado, contraste, estados y acciones accesibles; sin depender del color |
| AC-29 | Listado vacío, carga, error de fuente, integridad `Revisar` y reintento | Estados explícitos; sin filas/importes ficticios; la ficha conserva identidad/fechas si falla el anual |
| AC-30 | Consultar Viaje/Evento y un Gasto CAT009 sin REF | Viaje/Evento siguen sin ficha; CAT009 sin REF sigue permitido; no se fuerza crear vehículo |
| AC-31 | Inspeccionar integración Referencias/Movimientos | `POST/PATCH /api/referencias` atómicos; `validateReference` exige ficha; `referenceUsage`/`ledgerRows` reutilizados; sin ruta paralela |
| AC-32 | Revisar alcance y dependencias | Sin Base B, D5/Exterior, Comida, B3/Dev32, maestro alternativo de vehículos, hechos duplicados ni módulo Navidad |
| AC-33 | Consultar auditoría de ficha y Referencia | Cambios con actor, UTC y antes/después; sin DELETE ni historia reescrita |
| AC-34 | Intentar corregir fechas/importes desde la ficha | La ficha no edita Gastos ni importes; solo enlaza a Movimientos; no se duplican hechos |
| AC-35 | Revisar wireframes W1–W10 en 390/1440 | Listado, ficha, alta/edición, integridad, cobertura y conversión desde Referencias presentes; estados y candidatos visibles |
| AC-36 | Corregir la matrícula: valor igual al guardado; valor de otra ficha; confirmar; revisar ID/REF/historial | Sin cambio no pide confirmación; con otra ficha devuelve 409 y exige confirmación; confirmado guarda, conserva ID/REF/historial y permite duplicados |
| AC-37 | Confirmar duplicado sin `candidateHash`, con formato inválido o con hash de otro contexto | 422 o `409 DUPLICATE_CONTEXT_CHANGED` según el caso; sin escritura; candidatos del cliente ignorados |
| AC-38 | Transición E1.5-AC-11/E1.5-AC-18: crear Vehículo; intentar Navidad; CAT009 sin REF; CAT009 con REF Vehículo sin ficha | Vehículo operativo por E3.3; Navidad bloqueada; CAT009 sin REF válido; REF Vehículo sin ficha rechazada; sin ficha huérfana |
| AC-39 | Revisar contrato E2.4: `control`, `corte`, `hechos`, `subtotal`, `procedencia`, coberturas y totales | Un solo universo/intervalo; subtotal = suma de hechos; totalAlCorte = ejecutado E2.4; totalAnual solo si cobertura anual completa; sin fórmula paralela |
| AC-40 | Recorrer Referencias → convertir a Vehículo → editar ficha; intentar conversión usada/con ficha | W9/W10 muestran impacto y bloqueo; conversión elegible crea ficha atómica; edición conserva valores/revisiones; aviso Q6-A y candidateHash |

## 15. Trazabilidad
| Criterio de roadmap | Criterios de esta specification |
| --- | --- |
| E3.3-AC1: una ficha por Referencia Vehículo, ID estable | AC-01–AC-14, AC-30, AC-31, AC-33, AC-36, AC-38, AC-40 |
| E3.3-AC2: Gasto año solo de Gastos reales vinculados y ejercicio | AC-15–AC-25, AC-34, AC-39 |
| E3.3-AC3: Viaje/Evento sin ficha; sin módulo Navidad | AC-30, AC-32, AC-38 |
| Transversales de integridad, API y UI | AC-02, AC-07, AC-26–AC-29, AC-35, AC-37, AC-40 |

## 16. Matriz del primer informe QA H1–H6
| H | Hallazgo | Corrección aplicada | Evidencia |
| --- | --- | --- | --- |
| H1 | Se añadió una restricción nueva al cambio de Tipo, no aprobada en Q3 | Restituida Q3: con ficha se bloquea; sin ficha y sin hechos se permite conversión explícita con ficha atómica; con hechos bloquea E1.5; sin delete/recreate | §2 Q3, §3, §4.1, AC-05/06 |
| H2 | Se mezclaba cobertura al corte con cobertura anual y podía leerse como total anual completo | Reutilizado E2.4; separadas `coberturaAlCorte`/`coberturaAnual` y `totalAlCorte`/`totalAnual`; Q4 sin cambios | §6, AC-19–AC-22, AC-39 |
| H3 | Integración incompleta de Referencias/Movimientos y riesgo de ruta paralela | `POST/PATCH /api/referencias` como única alta/edición; `validateReference` exige ficha; `referenceUsage` y `ledgerRows` reutilizados; sin `POST /api/vehiculos` | §4, §11, AC-01–AC-06, AC-31 |
| H4 | Estados de integridad insuficientes | Añadidos `OK`/`Revisar`/`No disponible`, motivos, lectura sin reparación y bloqueo de escritura | §7, §10, AC-07 |
| H5 | Confirmación de duplicados no definida en servidor | Añadidos candidatos server-side, `409`, `candidateHash`, confirmación atómica, idempotencia y auditoría; Q6-A extiende el mismo flujo a la matrícula editada, excluyendo la propia ficha | §8, §12, AC-10/11, AC-36/37 |
| H6 | Wireframes incompletos | Añadidos W1–W10 con 390/1440, listado, ficha, alta/edición, integridad, cobertura y conversión | §9, AC-28/AC-35/AC-40 |

## 17. Matriz del segundo informe QA F1–F6
| F | Hallazgo | Corrección aplicada | Evidencia |
| --- | --- | --- | --- |
| F1 | Reglas, DTO, wireframes y AC no describían de forma unificada el intervalo control/corte, subtotal, procedencia, cobertura anual y cero verificable; riesgo de fórmula paralela | §6 define un único contrato E2.4: `universo`, `control`, `corte`, `hechos`, `subtotalRegistrado`, `procedencia`, coberturas, totales y `ceroVerificado`; DTO §11, W1–W10 y AC-19–AC-22/AC-39 usan los mismos campos. Q4 no se reabre | §6, §11, §9, AC-19–AC-22, AC-39 |
| F2 | Transición de E1.5-AC-11/E1.5-AC-18 incompleta | §4.4 documenta qué cambia al habilitar Vehículo y qué permanece bloqueado; E1.5 no se reescribe | §4.4, AC-38 |
| F3 | Contradicción 404/`Revisar` en la lectura del vehículo | §7 añade resolución única: 404 solo para REF inexistente o no-Vehículo sin ficha; 200 + `Revisar` para Vehículo sin ficha, ficha huérfana o duplicada; API y AC-07 alineados | §7, §11, AC-07 |
| F4 | Confirmación de duplicados y validación de `candidateHash` imprecisas | §8 define emisión, contenido, revalidación, 422/409, exclusión de la propia ficha, matrícula sin cambios, idempotencia y auditoría; DTO/escritura y AC-10/11/36/37 alineados | §8, §11, §12, AC-10/11/36/37 |
| F5 | Faltaba mostrar conversión desde Referencias y estado de edición | W5/W6 incluyen edición con revisiones y aviso; W9/W10 muestran conversión, impacto, requisitos y bloqueo; AC-35/40 | §9, AC-35, AC-40 |
| F6 | Fechas pasadas y historia de respuestas | Q2, §12 y AC-14 aceptan fechas pasadas sin normalizar; el brainstorming incorpora tabla de respuestas que sustituyen `PENDING` | §2 Q2, §12, AC-14; brainstorming |

## 18. Comprobación de coherencia
Revisión manual del candidato; no es implementación ni prueba funcional.

| Eje | Decisión | Contrato/DTO | UI | AC |
| --- | --- | --- | --- | --- |
| Identidad y fechas | Q1/Q2/Q3/Q6 | REF PK, ficha 1:1, matrícula/fechas NULL, Q3/Q6-A | W1–W6, W9/W10 | AC-01–AC-14, AC-36, AC-38, AC-40 |
| Gasto anual | Q4/Q5 + E2.4 | `universo`, `control`, `corte`, `hechos`, `subtotal`, `procedencia`, coberturas, totales, `ceroVerificado` | W1–W4, W7/W8 | AC-15–AC-25, AC-39 |
| Integridad | F3 | `OK`/`Revisar`/`No disponible`; 404 solo fuera de vehículo | W7/W8 | AC-07 |
| Duplicados | Q3/Q6-A/F4 | candidatos + `candidateHash` + confirmación server-side | W5/W6 | AC-10/11/36/37 |
| Transición E1.5 | F2 | AC-11/18 acotados; Navidad/Anticipo/Compartido fuera | W9/W10 | AC-38 |
| Fuente y migración | E1.4/E2.4 | Movimientos; sin maestro ni total persistido; migración/backup | W1–W10 | AC-25, AC-31, AC-39 |

## 19. Pendiente antes de aprobar
- **Q6-A confirmada (usuario, 2026-10-26):** la corrección de matrícula aplica la misma
  detección, aviso y confirmación server-side que el alta/renombrado; excluye la propia
  ficha; no pide confirmación si la matrícula no cambia; exige confirmación si coincide
  con otra ficha; permite duplicados confirmados; sin unicidad global; conserva ID,
  Referencia e historial.
- Revisión y aprobación expresa de esta specification rev4 y de los wireframes W1–W10.
- La distinción `coberturaAlCorte`/`coberturaAnual` y `totalAlCorte`/`totalAnual` se
  documenta como corrección F1, sin cambiar la regla Q4: no hay una pregunta adicional.
- Tras la aprobación, desarrollo15 seguirá necesitando autorización separada; no se
  incluye SQL, migración, datos reales, publicación ni merge.
