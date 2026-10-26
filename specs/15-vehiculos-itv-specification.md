# 15 — E3.3 Vehículos y control ITV: Specification
Status: **DRAFT rev2** — Q1–Q5 confirmadas; Q6 pendiente; specification y wireframes
pendientes de aprobación.
Approval source/date: Q1–Q5, usuario, 2026-10-26. Aprobación de esta revisión:
PENDING. Esta propuesta no autoriza desarrollo15, SQL, datos reales, push de
publicación ni merge.
QA source: correcciones solicitadas sobre el informe de QA independiente del SHA
`4d037cd`. Historial: rev1 `4d037cd`; rev2 corrige H1–H6 sin reabrir Q1–Q5.
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

**In:** ficha 1:1; alta atómica; matrícula opcional; próxima ITV y cita manuales;
consulta por ejercicio natural; cobertura al corte y cobertura anual separadas;
estados de integridad; duplicados con confirmación en servidor; renombrado;
desactivación/reactivación heredada; API protegida; wireframes 390/1440; validación,
errores, auditoría y criterios de aceptación.
**Out:** Base B/Compartidos; D5/Exterior; Comida; B3/Dev32; seguros personales como
módulo; activos inmobiliarios; marca/modelo/kilometraje; historial 1:N de ITV;
recordatorios o automatización externa; planificación/presupuesto; importación
histórica; módulo Navidad; implementación, SQL y merge.

## 2. Decisiones confirmadas Q1–Q5

### Q1 — Contenido mínimo
Ficha mínima con la Referencia como identidad estable, nombre visible, matrícula
opcional y fechas manuales. No se incorporan marca, modelo, combustible, kilometraje
ni seguro como datos de la ficha.

### Q2 — Fechas manuales
Próxima ITV y cita son dos fechas civiles independientes y opcionales; la cita puede
quedar vacía. No hay historial 1:N, periodicidad calculada, recordatorios ni avisos
automáticos. La fecha de ITV no determina el ejercicio ni el gasto anual.

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

Precisión transversal: única fuente de verdad de Gastos en Movimientos; sin duplicar
hechos ni introducir maestros adicionales.

## 3. Compatibilidad con contratos aprobados
| Contrato | Relación | Conflicto |
| --- | --- | --- |
| P2 | REFxxx estable/único/inmutable; nombre editable; enlaces por ID. La ficha usa la REF como PK y no duplica el nombre como clave. | Ninguno. Se conserva. |
| E1.5 CAT009 | La Referencia de vehículo sigue siendo opcional en un Gasto. E3.3 habilita el Tipo y exige ficha cuando la REF es de tipo Vehículo. | Ninguno. No se convierte CAT009 en obligatoria ni se añade compatibilidad opcional nueva. |
| E1.5 cambio de Tipo (H1) | Se aplica Q3 aprobada: REF con ficha no cambia de Tipo; REF sin ficha y sin hechos puede convertirse a Vehículo creando la ficha atómicamente; REF usada por cualquier hecho se bloquea por E1.5. No hay borrado ni recreación automática. | Ninguno. La conversión con ficha fuera de E3.3 exige decisión explícita; no se propone una restricción general nueva. |
| E2.4 ejercicio/cobertura (H2) | Se reutiliza el contrato de año natural, Fecha real, exclusión de anulados, `control`, `corte`, `cobertura al corte`, `subtotal registrado` y motivos. Se distingue `cobertura anual`, que no se presume por el corte. | Ninguno. Q4 no se modifica: sigue siendo año natural, sin planificación y con parciales explícitos. |
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
| Gasto anual | No persistido | Read model derivado; `coberturaAlCorte`, `coberturaAnual`, `totalAlCorte`, `totalAnual`, `subtotalRegistrado`, `motivo` y `gastos`. Sin tabla de totales ni de hechos. |

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

### 6.2 Contrato E2.4 y distinción de coberturas
Se reutiliza el contrato de E2.4 sin alterar Q4:
- **`coberturaAlCorte`:** `Verificable al corte`, `Parcial` o `No disponible`. Solo es
  verificable si existe un intervalo continuo desde el inicio del año hasta el corte.
- **`coberturaAnual`:** `Completa` solo si `coberturaAlCorte` es verificable y el
  intervalo/corte alcanza el 31/12 del ejercicio; en un año abierto antes de fin de año
  es `Abierta`; en un año pasado sin ese alcance es `No verificada`; un año futuro es
  `Futura`. La cobertura al corte no demuestra por sí sola la cobertura anual.
- **`totalAlCorte`:** ejecutado verificable al corte, según E2.4. Si la cobertura al
  corte es parcial o no disponible, es `null`.
- **`totalAnual`:** solo existe si `coberturaAnual = Completa`; en otro caso es `null`.
  No se presenta un total anual completo por tener cobertura al corte.
- **`subtotalRegistrado`:** suma exacta de los Gastos conocidos dentro del universo y
  del intervalo de control/corte aplicable, según E2.4. Un Gasto conocido no se
  descarta por cobertura parcial: entra en el subtotal; la cobertura solo decide qué
  total puede declararse.
- **`motivo`:** causa legible de la cobertura parcial/no disponible, sin inventar datos.

### 6.3 Presentación y extremos
- **Cero comprobado:** solo si la cobertura aplicable es verificable y no hay Gastos
  elegibles. Se muestra `0,00 €` con la etiqueta de verificado.
- **Ausencia:** si no hay Gastos conocidos pero la cobertura no es verificable, se
  muestra «Sin Gastos registrados conocidos» o «No disponible», no un cero verificado.
- **Año futuro:** `coberturaAnual = Futura`; no se presenta como cero verificado.
- **Cambio de ejercicio:** el selector recalcula solo con el nuevo año; no hay arrastre,
  saldo inicial, copia ni prorrateo. Un Gasto de diciembre pertenece a diciembre aunque
  su Ciclo sea de enero. La fecha de ITV no mueve ningún Gasto.
- **Renombrado o inactividad:** el ID de REF no cambia; el gasto anual histórico se
  conserva. Una REF inactiva no admite nuevos enlaces, pero su ficha y sus Gastos
  históricos siguen consultables.
- **Una sola fuente:** no se crea una tabla de Gastos de vehículo ni se copian hechos.
  La lista de Gastos del año enlaza a los Movimientos canónicos. Si en el futuro se
  instala un histórico transitorio, su integración deberá deduplicar contra Movimientos;
  E3.3 no lo consume en esta entrega.
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
- Una ficha con REF de otro Tipo no se presenta como vehículo; se muestra en integridad
  y no se computa como Gasto de vehículo.
- La lista de integridad es de solo lectura y enlaza a la REF y a los Movimientos.
- `GET /api/vehiculos/{REF}` de una REF Vehículo sin ficha devuelve `ficha: null`,
  `integridad: "Revisar"` y el Gasto al corte si procede; no devuelve 404 ni crea ficha.
- Una ficha con REF de otro Tipo no se devuelve como vehículo normal; aparece en
  `/api/vehiculos/integridad`.
- `POST`/`PATCH` impiden crear nuevas REF Vehículo sin ficha o nuevas fichas inválidas;
  las lecturas no reparan datos históricos.

## 8. Confirmación de duplicados en servidor (H5)
- **Alcance confirmado:** alta de vehículo y renombrado de la Referencia. Se comparan
  nombre y matrícula; una coincidencia en cualquiera genera aviso. No hay unicidad
  global ni fusión.
- **Cálculo:** el servidor busca coincidencias por valor exacto o clave efímera de
  presentación (trim + minúsculas), incluyendo fichas activas e inactivas. La clave no
  se persiste ni altera el valor guardado.
- **Sin confirmación:** `409 DUPLICATE_WARNING` con `coincidencias` (REF, nombre,
  matrícula, estado) y `candidateHash`; no se escribe nada.
- **Confirmación:** el cliente reenvía la operación con `confirmarDuplicado: true` y el
  `candidateHash` vigente. El servidor recalcula las coincidencias y solo escribe si el
  conjunto coincide; si cambió, devuelve 409 de nuevo. El hash liga candidatos,
  revisión y campos comparados; no se acepta una lista de candidatos enviada por el
  cliente.
- **Atomicidad e idempotencia:** la confirmación forma parte del payload idempotente;
  un 409 no se registra como éxito. Un reintento confirmado no duplica la REF/ficha.
- **Auditoría:** se registra `duplicado_confirmado` con el hash de candidatos y la
  revisión, sin duplicar importes ni hechos.
- **Matrícula en edición:** el alcance del aviso al corregir una matrícula existente es
  la única decisión funcional abierta (**Q6**, §17). Hasta su respuesta, la
  specification no fija una regla nueva para ese caso; el resto del flujo servidor
  (alta y renombrado) queda definido.

## 9. Pantallas y wireframes (H6)
Datos ficticios. Se reutiliza el shell, tokens, tablas/tarjetas, foco y componentes
existentes. La aprobación visual no acredita implementación ni pruebas de navegador.
W1, W2, W5 y W7 son 1440; W3, W4, W6 y W8 son 390.

### W1 — Listado de vehículos (1440)
```text
Vehículos · Ejercicio [2026 v]                         [+ Nuevo vehículo]
Cobertura al corte: Parcial · Corte 30/06/2026 · [Ver motivo]
Cobertura anual: Abierta · Total anual: No disponible

REF      Nombre           Matrícula    Próx. ITV   Cita        Gasto al corte       Cob. anual    Integridad  Estado
REF1001  Coche principal  1234 ABC     12/09/2026  20/08/2026  1.240,00 € Parcial   Abierta       OK          Activa
REF1002  Moto             5678 DEF     No informada —          0,00 € verificado    Abierta       OK          Activa
REF1003  Furgoneta        Sin informar 03/03/2027  —          No disponible        No verificada Revisar     Inactiva
```

### W2 — Ficha de vehículo (1440)
```text
‹ Volver   REF1001 · Coche principal                              [Activa]
Identidad estable: REF1001 (no editable)
Nombre: [Coche principal]  Matrícula: [1234 ABC]  [Editar ficha]
Próxima ITV: [12/09/2026]  Cita: [20/08/2026]
Fechas manuales e independientes; la cita puede quedar vacía.
Integridad: OK

Gasto año [2026 v]
Cobertura al corte: Parcial · Corte 30/06/2026 · [Ver motivo]
Gasto al corte: 1.240,00 € (subtotal registrado)
Cobertura anual: Abierta · Total anual: No disponible

Gastos del año (3)                                      [Ver en Movimientos]
Fecha        Concepto                 Partida             Importe
15/02/2026   Mantenimiento            PAR101 · Coche      120,00 €
20/06/2026   Seguro                   PAR102 · Coche      400,00 €
30/06/2026   Combustible              PAR103 · Coche      720,00 €

Historial de la ficha: [Ver auditoría]
```

### W3 — Listado de vehículos (390)
```text
Vehículos [2026 v]                         [+ Nuevo]
Cobertura al corte: Parcial · anual: Abierta

REF1001 · Coche principal [Activa]
1234 ABC · Próx. ITV 12/09/2026 · Cita 20/08/2026
Gasto al corte 1.240,00 € Parcial
Cobertura anual: Abierta · Integridad: OK

REF1002 · Moto [Activa]
5678 DEF · Próx. ITV No informada
Gasto al corte 0,00 € verificado
Cobertura anual: Abierta · Integridad: OK

REF1003 · Furgoneta [Inactiva]
Sin matrícula · Próx. ITV 03/03/2027
Gasto al corte: No disponible · Integridad: Revisar
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
Cobertura al corte: Parcial · Corte 30/06/2026
Gasto al corte 1.240,00 € · subtotal registrado
Cobertura anual: Abierta
Total anual: No disponible · [Ver motivo]
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
En edición se muestran los valores reales; el aviso de duplicado se aplica al
renombrar (y a la matrícula según Q6); la acción es [Confirmar y guardar].
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
En edición, la acción es [Confirmar y guardar]; Q6 decide si la matrícula avisa.
```

### W7 — Integridad y cobertura (1440)
```text
Integridad de vehículos · Ejercicio 2026
[Revisar] REF1004 · Vehículo sin ficha · Gasto al corte 120,00 €
    No se crea ni repara automáticamente. [Ver REF] [Ver Movimientos]
[Revisar] Ficha REF1005 · REF de tipo Viaje · No es un vehículo
    Se conserva el dato; sin acciones de borrado.
[No disponible] Cobertura al corte: No disponible · Cobertura anual: No verificada
    No se muestra 0 ni total anual.
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
No se muestra 0 ni total anual.
```

Notas comunes: la lista y la ficha muestran «No informada» para fechas ausentes; nunca
0. «Parcial»/«No disponible» no son cero. No hay marca/modelo/kilometraje, recordatorios
ni edición de Movimientos desde la ficha.

## 10. Estados vacío, carga y error
- Listado sin vehículos: «Sin vehículos» + Nuevo vehículo; no filas ficticias.
- Ficha inexistente: 404 con mensaje accionable y vuelta al listado.
- Carga: estado visible; se conserva el ejercicio seleccionado y los filtros.
- Error de Movimientos o de la fuente anual: identidad/fechas siguen visibles; el gasto
  muestra «No disponible»/«Parcial», `cobertura anual` y motivo, sin borrar el resto.
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
| `PATCH /api/referencias/{REF}` | Editar nombre, estado, Tipo y ficha | `revision` y `fichaRevision` cuando proceda; Q3 para Tipo; `vehiculo` solo con Tipo Vehículo; auditoría. |
| `GET /api/referencias?tipo=Vehículo` | Catálogo de Referencias | Filtro operativo; no escribe; identidad/nombre de Referencias. |
| `GET /api/vehiculos?ejercicio=YYYY&page=N` | Listado con ficha, integridad y resumen anual | Autenticado; paginación; no escribe; totales de la página completos. |
| `GET /api/vehiculos/{REF}?ejercicio=YYYY` | Ficha, integridad, coberturas y Gastos | 404 solo si la REF no existe o no es Vehículo; REF Vehículo sin ficha devuelve `ficha:null` + `Revisar`; no repara integridad. |
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
    "coberturaAlCorte": "Parcial",
    "coberturaAnual": "Abierta",
    "corte": "2026-06-30",
    "control": {"inicio": "2026-01-01", "fin": "2026-06-30"},
    "subtotalRegistrado": "1240.00",
    "totalAlCorte": null,
    "totalAnual": null,
    "hechosConocidos": 3,
    "motivo": "Cobertura anterior al control no verificada; histórico no instalado o incompleto",
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
- La lista y la ficha declaran `coberturaAlCorte`, `coberturaAnual`, `corte`, `control`,
  `motivo`, `totalAlCorte` y `totalAnual`; null no se convierte en 0.
- Un cambio concurrente de Referencia, ficha o hechos invalida la revisión y devuelve
  409 sin escritura parcial.
- No se habilitan rutas Exterior, Base B, Comida, B3/Dev32 ni fixtures de producción.

## 12. Validación y casos extremos
- **Nombre:** obligatorio, reglas de Referencia existentes (máximo 120, sin caracteres
  de control); se conserva el valor literal. Renombrar no cambia IDs ni enlaces.
- **Matrícula:** opcional; máximo 32 caracteres; sin caracteres de control; se conserva
  literal (sin uppercase ni eliminación silenciosa de espacios). No es única.
- **Fechas:** opcionales; ISO `YYYY-MM-DD` válida; pueden ser pasadas o futuras; no se
  calcula periodicidad, no se deriva una de otra, no se rellena con hoy. `null` limpia;
  PATCH omitido conserva. Cambios auditados.
- **Alta:** `tipo=Vehículo` crea REF + ficha; fallo en cualquier paso revierte ambas;
  reintento idempotente no duplica; dos procesos no crean dos fichas.
- **Tipo incorrecto:** ficha para Viaje/Evento/Anticipo/Compartido rechazada; `vehiculo`
  con Tipo no Vehículo rechazado.
- **Ficha duplicada:** unicidad por REF; 409/rollback; no segunda ficha.
- **Tipo Vehículo (Q3):** con ficha, cambio bloqueado; sin ficha y sin hechos, conversión
  explícita a Vehículo con ficha atómica; con hechos, bloqueo E1.5. No delete/recreate.
- **Integridad de lectura:** REF Vehículo sin ficha o ficha con Tipo incorrecto se
  muestra como `Revisar`/No disponible; no se auto-repara.
- **Duplicados de nombre/matrícula:** coincidencia exacta o clave efímera (trim +
  minúsculas) solo para aviso; no se guarda la clave. Confirmación server-side con
  `candidateHash`; nunca fusión.
- **Matrícula en edición:** Q6 pendiente; no se fija regla nueva hasta respuesta.
- **Gasto año:** un Gasto de otra REF no cuenta; un Gasto con REF Vehículo y cualquier
  Partida sí cuenta; anulados no cuentan; rectificados reevalúan; no doble cómputo.
- **Cambio de ejercicio:** diciembre/enero y Ciclo distinto no arrastran; ITV no mueve
  el gasto; año futuro no es 0 verificado.
- **Cobertura:** `coberturaAlCorte` y `coberturaAnual` separadas; `totalAlCorte` solo si
  la primera es verificable; `totalAnual` solo si la segunda es completa; parcial
  muestra subtotal; ausencia no es 0.
- **Inactividad:** ficha e histórico visibles; no nuevos enlaces; reactivar no crea
  hechos.
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
| AC-07 | Leer REF Vehículo sin ficha, ficha con REF de otro Tipo o ficha duplicada | Integridad `Revisar`/No disponible con motivo; sin auto-reparación ni escritura |
| AC-08 | Renombrar la Referencia | Mismo REFxxx, enlaces e historia; Gasto año sin cambio; auditoría |
| AC-09 | Crear/editar/limpiar matrícula opcional | Se conserva o queda «Sin informar»; sin unicidad global; auditoría |
| AC-10 | Crear/renombrar con nombre o matrícula coincidente sin confirmar | `409 DUPLICATE_WARNING` con candidatos y `candidateHash`; sin escritura |
| AC-11 | Confirmar duplicado con `candidateHash` vigente; candidatos cambiados | Con hash vigente escribe y audita; si cambió, 409 sin escritura |
| AC-12 | Desactivar y reactivar una REF con ficha e historial | Ficha e historia conservadas; sin nuevos enlaces mientras inactiva; sin hechos nuevos al reactivar |
| AC-13 | Alta sin próxima ITV ni cita; después informar una sola | Ambas ausentes como «No informada»; independencia; la cita vacía es válida |
| AC-14 | Editar fechas pasadas/futuras, limpiar una y conservar la otra | Fechas civiles válidas; sin cálculo de periodicidad; PATCH omitido conserva; null limpia; auditoría |
| AC-15 | Varios Gastos con la REF, Partidas distintas | Todos cuentan una vez; suma exacta; sin filtro por Categoría/Partida |
| AC-16 | Gastos de otra REF, Ingresos, Transferencias, Amortizaciones, Presupuesto y anulados | No cuentan; no se mezcla planificación; originales intactos |
| AC-17 | Gasto de diciembre con Ciclo de enero; ITV en otro año | Pertenece al año de su Fecha real; la ITV no mueve el gasto; sin arrastre |
| AC-18 | Abrir ficha y cambiar el selector de ejercicio | Inicializa en el año natural actual; recalcula solo el año elegido; pasado/futuro consultables |
| AC-19 | Cobertura al corte parcial con hechos conocidos | `coberturaAlCorte=Parcial`, `subtotalRegistrado` y motivo; `totalAlCorte=null`; `totalAnual=null` |
| AC-20 | Cobertura al corte verificable pero año abierto | `totalAlCorte` verificado; `coberturaAnual=Abierta`; `totalAnual=null`; no se declara total anual completo |
| AC-21 | Cobertura al corte verificable que alcanza el 31/12 del ejercicio | `coberturaAnual=Completa`; `totalAnual` verificado; coincide con el ejecutado cuando corresponda |
| AC-22 | Ejercicio verificable sin Gastos; año futuro sin cobertura | Cero verificado solo en el primero; el futuro no se presenta como 0 verificado |
| AC-23 | Rectificar o anular un Gasto vinculado | El Gasto año se recalcula una vez; el original se conserva; sin doble cómputo |
| AC-24 | Renombrar o desactivar la REF y consultar años anteriores | ID y totales históricos se conservan; no se reescriben hechos |
| AC-25 | Inspeccionar persistencia y fuentes del Gasto año | Solo Movimientos como fuente de Gastos; sin tabla de totales, hechos duplicados ni maestro alternativo |
| AC-26 | API sin sesión, sin CSRF, revisión obsoleta, payload inválido, replay o DELETE | Rechazo seguro; 404/409/422 sin datos sensibles; idempotencia, sin DELETE y sin escritura parcial |
| AC-27 | Cambio rápido de ejercicio/ficha con respuesta antigua | La respuesta antigua no sustituye la selección vigente; filtros y borrador se conservan |
| AC-28 | UI 390/1440 de listado, ficha, alta, edición, integridad y cobertura | Etiquetas completas, foco/teclado, contraste, estados y acciones accesibles; sin depender del color |
| AC-29 | Listado vacío, carga, error de fuente, integridad `Revisar` y reintento | Estados explícitos; sin filas/importes ficticios; la ficha conserva identidad/fechas si falla el anual |
| AC-30 | Consultar Viaje/Evento y un Gasto CAT009 sin REF | Viaje/Evento siguen sin ficha; CAT009 sin REF sigue permitido; no se fuerza crear vehículo |
| AC-31 | Inspeccionar integración Referencias/Movimientos | `POST/PATCH /api/referencias` atómicos; `validateReference` exige ficha; `referenceUsage`/`ledgerRows` reutilizados; sin ruta paralela |
| AC-32 | Revisar alcance y dependencias | Sin Base B, D5/Exterior, Comida, B3/Dev32, maestro alternativo de vehículos, hechos duplicados ni módulo Navidad |
| AC-33 | Consultar auditoría de ficha y Referencia | Cambios con actor, UTC y antes/después; sin DELETE ni historia reescrita |
| AC-34 | Intentar corregir fechas/importes desde la ficha | La ficha no edita Gastos ni importes; solo enlaza a Movimientos; no se duplican hechos |
| AC-35 | Revisar wireframes W1–W8 en 390/1440 | Listado, ficha, alta/edición, integridad y cobertura presentes; estados y candidatos visibles |

## 15. Trazabilidad
| Criterio de roadmap | Criterios de esta specification |
| --- | --- |
| E3.3-AC1: una ficha por Referencia Vehículo, ID estable | AC-01–AC-14, AC-30, AC-31, AC-33 |
| E3.3-AC2: Gasto año solo de Gastos reales vinculados y ejercicio | AC-15–AC-25, AC-34 |
| E3.3-AC3: Viaje/Evento sin ficha; sin módulo Navidad | AC-30, AC-32 |
| Transversales de integridad, API y UI | AC-02, AC-07, AC-26–AC-29, AC-35 |

## 16. Matriz de correcciones QA H1–H6
| H | Hallazgo | Corrección aplicada | Evidencia |
| --- | --- | --- | --- |
| H1 | Se añadió una restricción nueva al cambio de Tipo, no aprobada en Q3 | Restituida Q3: con ficha se bloquea; sin ficha y sin hechos se permite conversión explícita con ficha atómica; con hechos bloquea E1.5; sin delete/recreate | §2 Q3, §3, §4.1, AC-05/06 |
| H2 | Se mezclaba cobertura al corte con cobertura anual y podía leerse como total anual completo | Reutilizado E2.4; separadas `coberturaAlCorte`/`coberturaAnual` y `totalAlCorte`/`totalAnual`; Q4 sin cambios | §6, AC-19–AC-21 |
| H3 | Integración incompleta de Referencias/Movimientos y riesgo de ruta paralela | `POST/PATCH /api/referencias` como única alta/edición; `validateReference` exige ficha; `referenceUsage` y `ledgerRows` reutilizados; sin `POST /api/vehiculos` | §4, §11, AC-01–AC-06, AC-31 |
| H4 | Estados de integridad insuficientes | Añadidos `OK`/`Revisar`/`No disponible`, motivos, lectura sin reparación y bloqueo de escritura | §7, §10, AC-07 |
| H5 | Confirmación de duplicados no definida en servidor | Añadidos candidatos server-side, `409`, `candidateHash`, confirmación atómica, idempotencia y auditoría; Q6 solo para matrícula editada | §8, §12, AC-10/11 |
| H6 | Wireframes incompletos | Añadidos W1–W8 con 390/1440, listado, ficha, alta/edición, integridad y cobertura | §9, AC-28/AC-35 |

## 17. Pendiente antes de aprobar
- **Q6 (única decisión funcional abierta):** ¿el aviso/confirmación de duplicado debe
  aplicarse también al **corregir la matrícula** de una ficha existente?
  - A) Sí, mismo aviso y confirmación server-side que en alta/renombrado (recomendada).
  - B) No; solo en alta y renombrado de nombre; la corrección de matrícula es una
    corrección de dato y no avisa.
  - C) Solo cuando la matrícula anterior estuviera vacía.
  - Confirmada: PENDING; source/date: PENDING.
- Revisión y aprobación expresa de esta specification rev2 y de los wireframes W1–W8.
- La distinción `coberturaAlCorte`/`coberturaAnual` y `totalAlCorte`/`totalAnual` se
  documenta como corrección H2, sin cambiar la regla Q4: no hay una pregunta adicional.
- Tras la aprobación, desarrollo15 seguirá necesitando autorización separada; no se
  incluye SQL, migración, datos reales, publicación ni merge.
