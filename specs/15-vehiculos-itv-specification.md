# 15 — E3.3 Vehículos y control ITV: Specification
Status: **DRAFT** — Q1–Q5 confirmadas por el usuario el 2026-10-26; specification y
wireframes pendientes de aprobación.
Approval source/date: Q1–Q5, usuario, 2026-10-26. Aprobación de esta specification:
PENDING. Esta propuesta no autoriza desarrollo15, SQL, datos reales, push de
publicación ni merge.
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
consulta por ejercicio natural; cobertura y subtotal; renombrado; duplicados
revisables; desactivación/reactivación heredada; API protegida; wireframes 390/1440;
validación, errores, auditoría y criterios de aceptación.
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
| E1.5 cambio de Tipo | La regla general de protección por uso se conserva para los tipos existentes. E3.3 añade un gate específico: en esta entrega no se cambia el Tipo de una Referencia hacia o desde `Vehículo`; el alta de vehículo es la única vía de creación y no se elimina ni recrea ninguna ficha automáticamente. | No hay contradicción material: E1.5 no regulaba fichas E3. Es una precisión necesaria por la relación 1:1 y por la decisión Q3; una conversión excepcional exige un procedimiento explícito fuera de E3.3. Si el desarrollo encuentra una incompatibilidad real, debe detenerse antes de cambiarla. |
| E2.4 ejercicio/cobertura | Se reutiliza el año natural, la Fecha real frente al Ciclo, la exclusión de anulados y el contrato de cobertura/corte. | Ninguno. No se usa Presupuesto ni se convierte el Gasto año en planificación. |
| E3.1/E3.2 | Se reutiliza el patrón documentado de ficha 1:1, alta atómica, auditoría, revisión y no DELETE. | Ninguno. No se depende de su código, participantes, aportaciones ni Base B. |
| D5/Exterior | No se habilitan Transferencias Exterior ni aportaciones externas. | Ninguno. Las restricciones E1.5 se conservan. |
| Base B (E3.2) | No se usa CAT013, participantes, reparto ni motor de Compartidos. | No se detecta dependencia. Si apareciera una decisión pendiente de Base B, se devolvería como bloqueo. |

## 4. Funcionalidad
1. **Listado de vehículos:** fichas activas e inactivas consultables; REF, nombre,
   matrícula, próxima ITV, cita, gasto del ejercicio seleccionado, cobertura y estado.
2. **Ficha:** identidad REF no editable, nombre editable, matrícula y fechas manuales,
   auditoría, gasto anual y lista de Gastos vinculados.
3. **Alta:** crea REF tipo Vehículo + ficha en una transacción. Cualquier fallo revierte
   ambos; no hay REF huérfana ni ficha huérfana. El Tipo no es un selector libre.
4. **Edición:** nombre, matrícula y fechas; revisión y auditoría. El nombre es el de la
   Referencia; no se crea una segunda fuente de nombre.
5. **Duplicados:** una ficha por REF. Nombre/matrícula pueden coincidir; se muestra un
   aviso con coincidencias y se exige confirmación explícita para crear o renombrar.
   No se fusionan fichas ni se normalizan los valores guardados.
6. **Gasto año:** suma de Gastos reales vigentes de la REF en el año natural; selector
   de ejercicio; cobertura y subtotal; enlaces de solo lectura a Movimientos.
7. **Ciclo de vida:** desactivar/reactivar la Referencia conserva ficha e historia; no
   hay DELETE. Una REF inactiva no admite nuevos enlaces, pero su histórico se consulta.
8. **Integridad de lectura:** una REF Vehículo sin ficha, una ficha con REF de otro Tipo
   o una ficha duplicada se señalan como incidencia; no se reparan ni se crean datos al
   leer.

## 5. Modelo de datos y contratos
Modelo lógico documental; sin DDL, versión de esquema ni migración ejecutada.

| Objeto | Datos persistentes | Garantías / límites |
| --- | --- | --- |
| `referencias` | REFxxx, nombre, Tipo `Vehículo`, Estado, revisión, UTC | Identidad y nombre según P2/E1.5. El nombre no se duplica en la ficha. Sin DELETE. |
| `fichas_vehiculo` | `referencia` PK/FK única; `matricula` NULL; `proxima_itv` NULL; `fecha_cita` NULL; `revision`; `creado`/`actualizado` UTC | Una fila por REF de tipo Vehículo. Sin importes, estado manual ni total anual persistido. `matricula` sin índice único. |
| Auditoría de ficha | Reutiliza la tabla `audit` existente con entidad `ficha_vehiculo` | Append-only; conserva cambios de matrícula/fechas con actor, UTC, revisión y antes/después. No duplica hechos financieros ni crea un maestro de auditoría. |
| `reference_attempts` | Intento del alta de Referencia | Se reutiliza/extiende para el alta atómica de vehículo; no se crea un segundo contador de REF ni un maestro alternativo. |
| `movimientos` | Hechos existentes | Única fuente de Gastos. La ficha y el gasto anual solo leen; no copian importes, fechas ni Partidas. |
| Fuentes anuales E2.4 | `control`, `corte`, intervalos/histórico verificable | Se reutiliza el contrato de cobertura; E3.3 no inventa un corte ni suma histórico transitorio no instalado. |
| Gasto anual | No persistido | Read model derivado; `total`, `subtotalRegistrado`, `cobertura`, `motivo` y `gastos`. Sin tabla de totales ni de hechos. |

Reglas de integridad:
- `fichas_vehiculo.referencia` es única y apunta a una Referencia de tipo `Vehículo`.
- No se puede insertar una ficha para otro Tipo; no se puede crear una REF Vehículo sin
  ficha mediante el alta normal.
- Sin DELETE físico de ficha ni de REF. La baja funcional es la desactivación heredada.
- `matricula`, `proxima_itv` y `fecha_cita` son NULL o valores válidos; NULL no es `""`
  ni `0`.
- No se crea `marca`, `modelo`, `kilometraje`, `seguro`, `historial_itv` ni un catálogo
  global de vehículos.
- No se modifica el Tipo de una REF hacia o desde `Vehículo` en E3.3; no hay borrado,
  creación implícita ni recreación automática de la ficha.
- Los importes se manejan en céntimos exactos; DTO como string decimal, nunca number
  flotante. Las fechas económicas son civiles ISO; UTC solo para auditoría técnica.

## 6. Gasto anual y cobertura

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

### 6.2 Cálculo y presentación
- **Subtotal registrado:** suma exacta de los Gastos elegibles conocidos. Siempre se
  calcula desde Movimientos. Un Gasto conocido no se descarta por cobertura parcial:
  entra en el subtotal; la cobertura solo decide si el total puede declararse completo.
- **Total:** solo existe si la cobertura del ejercicio es verificable. Si la cobertura
  es parcial o no disponible, `total = null` y se muestra el subtotal registrado con la
  marca «Parcial» y el motivo. Nunca se presenta el subtotal como total completo.
- **Cobertura:** se reutiliza el contrato de fuentes/corte de E2.4. «Verificable al
  corte» exige un intervalo continuo que cubra el ejercicio hasta el corte; en otro
  caso es «Parcial» o «No disponible». Un error de fuente no se convierte en cero.
- **Cero comprobado:** solo si la cobertura es verificable y no hay Gastos elegibles.
  Se muestra `0,00 €` con la etiqueta de verificado.
- **Ausencia:** si no hay Gastos conocidos pero la cobertura no es verificable, se
  muestra «Sin Gastos registrados conocidos» o «No disponible», no un cero verificado.
- **Año futuro:** no se presenta como cero verificado; se muestra «No disponible» o
  «Parcial», con el motivo.
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

## 7. Pantallas y wireframes
Datos ficticios. Se reutiliza el shell, tokens, tablas/tarjetas, foco y componentes
existentes. La aprobación visual no acredita implementación ni pruebas de navegador.

### W1 — Listado de vehículos (1440)
```text
Vehículos · Gasto año [2026 v]                         [+ Nuevo vehículo]
Cobertura del ejercicio: Parcial · Corte 30/06/2026 · [Ver motivo]

REF      Nombre             Matrícula    Próxima ITV   Cita          Gasto año 2026        Estado
REF1001  Coche principal    1234 ABC     12/09/2026    20/08/2026    1.240,00 € Parcial    Activa
REF1002  Moto               5678 DEF     No informada  —             0,00 € verificado     Activa
REF1003  Furgoneta          Sin informar 03/03/2027    —             No disponible         Inactiva
```

Notas: el gasto mostrado corresponde al ejercicio del selector; «Parcial» y «No
disponible» no son cero. La lista móvil usa tarjetas equivalentes con los mismos datos.
No se muestran marca/modelo/kilometraje.

### W2 — Ficha de vehículo (1440)
```text
‹ Volver   REF1001 · Coche principal                              [Activa]
Identidad estable: REF1001 (no editable)
Nombre: [Coche principal]  Matrícula: [1234 ABC]  [Editar ficha]
Próxima ITV: [12/09/2026]  Cita: [20/08/2026]
Fechas manuales e independientes; la cita puede quedar vacía.

Gasto año [2026 v]
Cobertura: Parcial · Corte 30/06/2026 · [Ver motivo]
Subtotal registrado: 1.240,00 €
Total: No disponible mientras la cobertura sea parcial

Gastos del año (3)                                      [Ver en Movimientos]
Fecha        Concepto                 Partida             Importe
15/02/2026   Mantenimiento            PAR101 · Coche      120,00 €
20/06/2026   Seguro                   PAR102 · Coche      400,00 €
30/06/2026   Combustible              PAR103 · Coche      720,00 €

Historial de la ficha: [Ver auditoría]
```

Notas: el nombre pertenece a la Referencia; matrícula y fechas a la ficha. Los enlaces
a Gastos son de solo lectura; corregir/anular se hace en Movimientos. Un Gasto anulado
no aparece como computado.

### W3 — Ficha de vehículo (390)
```text
‹ Volver   REF1001 · Coche principal [Activa]
Matrícula: 1234 ABC
Próxima ITV: 12/09/2026
Cita: 20/08/2026
[Editar ficha]

Gasto año [2026 v]
Parcial · Corte 30/06/2026
Subtotal registrado 1.240,00 €
Total no disponible · [Ver motivo]
[Ver Gastos del año]

Historial de la ficha [Ver auditoría]
```

Notas: etiquetas completas, foco visible, sin depender del color; estados «No
informada», «Parcial» y «No disponible» explícitos. No hay recordatorios ni avisos
automáticos.

### W4 — Alta / edición (390)
```text
Nuevo vehículo · Tipo: Vehículo (fijo en esta alta)
Nombre *                 [________________________]
Matrícula (opcional)     [________________________]
Próxima ITV (opcional)   [__/__/____]
Cita (opcional)          [__/__/____]
La cita puede quedar vacía. No se calcula periodicidad ni se envían avisos.

[!] Coincidencias revisables:
    REF1001 · Coche principal · 1234 ABC
    Son vehículos distintos: [Confirmar y crear]

[Cancelar] [Crear vehículo]
Al confirmar se crean REF + ficha en una única transacción; un fallo revierte todo.
```

Notas: en edición se muestran los valores reales; una ausencia no se convierte en
cadena vacía guardada ni en cero. El aviso de duplicado no bloquea por unicidad global:
solo exige confirmación. Si la REF ya tiene ficha, no se ofrece alta duplicada.

## 8. Estados vacío, carga y error
- Listado sin vehículos: «Sin vehículos» + acción Nuevo vehículo; no filas ficticias.
- Ficha inexistente: 404 con mensaje accionable y vuelta al listado.
- Carga: estado visible; se conserva el ejercicio seleccionado y los filtros.
- Error de Movimientos o de la fuente anual: la ficha de identidad/fechas sigue visible;
  el gasto anual muestra «No disponible»/«Parcial» y el motivo, sin borrar el resto.
- Error de fuente anual no se convierte en 0; no se oculta la cobertura.
- Conflicto de revisión o tipo: 409; se conserva el borrador y se muestra el motivo.
- Alta fallida: rollback completo; no hay REF ni ficha parcial; mensaje sin payload.
- Duplicado: aviso con coincidencias; la confirmación explícita permite crear; no se
  fusiona ni se sobrescribe.
- Respuesta antigua: no sustituye un ejercicio/ficha seleccionados después.
- Sesión expirada: se conserva el borrador y se pide reautenticar sin exponer datos.
- Cobertura parcial: se muestra subtotal y motivo; nunca un total completo ni un cero
  verificado por ausencia.
- Sin fechas: «No informada»; no 0, no fecha de hoy, no fecha de creación.

## 9. API y dependencias externas
Propuesta de contrato; las rutas y el esquema físico quedan sujetos al desarrollo
autorizado, sin crear maestros ni hechos paralelos.

| Método y ruta | Uso | Reglas |
| --- | --- | --- |
| `GET /api/vehiculos?ejercicio=YYYY&page=N` | Listado con resumen anual | Autenticado; paginación; `ejercicio` válido; estado activo por defecto, inactivos consultables; totales de la página completos. |
| `GET /api/vehiculos/{REF}?ejercicio=YYYY` | Ficha, fechas, cobertura y Gastos del año | 404 si no existe; no escribe; no repara integridad; DTO estable. |
| `POST /api/vehiculos` | Alta atómica REF Vehículo + ficha | Nombre obligatorio; matrícula/fechas opcionales; Tipo fijo; idempotency-key; rollback; duplicado revisable. Reutiliza la reserva transaccional de REF; es la única vía de alta de una REF Vehículo. |
| `POST /api/referencias` | Alta genérica de Referencia | Rechaza `tipo=Vehículo`; una REF Vehículo no puede quedar sin ficha. |
| `PATCH /api/vehiculos/{REF}` | Editar nombre, matrícula y fechas | Exige `revisionReferencia` y `revisionFicha` cuando cambian campos de cada entidad; PATCH omitido conserva, null explícito vacía; actualización de nombre mediante el servicio de Referencias en la misma transacción; auditoría. |
| `PATCH /api/referencias/{REF}` | Cambio de Tipo/estado heredado | En E3.3 se bloquea cualquier cambio de Tipo hacia o desde `Vehículo`; no se crea ni se borra una ficha desde este endpoint. La conversión excepcional queda fuera de E3.3. |
| `POST /api/referencias/{REF}/desactivar` y `/reactivar` | Ciclo de vida heredado | Conserva ficha e historia; no DELETE; no crea hechos. |

DTO propuesto:
```json
{
  "referencia": {"id": "REF1001", "nombre": "Coche principal", "tipo": "Vehículo", "estado": "Activa", "revision": 1},
  "ficha": {"matricula": "1234 ABC", "proximaITV": "2026-09-12", "cita": null, "revision": 1},
  "gastoAnual": {
    "ejercicio": 2026,
    "subtotalRegistrado": "1240.00",
    "total": null,
    "hechosConocidos": 3,
    "cobertura": "Parcial",
    "motivo": "Cobertura anterior al control no verificada; histórico no instalado o incompleto",
    "corte": "2026-06-30",
    "control": {"inicio": "2026-01-01", "fin": "2026-06-30"},
    "gastos": [{"id": "123", "fecha": "2026-06-30", "importe": "720.00", "partida": {"id": "PAR103", "nombre": "Combustible"}}]
  }
}
```

Reglas de API:
- Reutilizar autenticación MFA/sesión, Origin/CSRF, límites JSON, validación Effect
  Schema, revisiones, idempotencia y auditoría existentes.
- No hay endpoint de escritura directa de Movimientos ni de totales anuales.
- El alta de vehículo no reserva una segunda identidad REF ni crea un maestro alterno.
- `GET` no escribe; una lectura no crea fichas para REF huérfanas ni corrige datos.
- Errores 404/409/422 sin SQL, payload financiero ni datos sensibles; no-store.
- La lista y la ficha declaran `cobertura`, `corte`, `control`, `motivo` y la diferencia
  entre total y subtotal.
- Un cambio concurrente de Referencia, ficha o hechos invalida la revisión y devuelve
  409 sin escritura parcial.
- No se habilitan rutas Exterior, Base B, Comida, B3/Dev32 ni fixtures de producción.

## 10. Validación y casos extremos
- **Alta genérica:** `POST /api/referencias` no crea `Vehículo`; el alta de vehículo es
  la única ruta y crea REF + ficha en la misma transacción.
- **Nombre:** obligatorio, reglas de Referencia existentes (máximo 120, sin caracteres
  de control); se conserva el valor literal. Renombrar no cambia IDs ni enlaces.
- **Matrícula:** opcional; máximo 32 caracteres; sin caracteres de control; se conserva
  literal (sin uppercase ni eliminación silenciosa de espacios). No es única.
- **Fechas:** opcionales; ISO `YYYY-MM-DD` válida; pueden ser pasadas o futuras; no se
  calcula periodicidad, no se deriva una de otra, no se rellena con hoy. `null` limpia;
  PATCH omitido conserva. Cambios auditados.
- **Alta:** fallo en cualquier paso revierte REF y ficha; reintento idempotente no
  duplica; dos procesos no crean dos fichas.
- **Tipo incorrecto:** alta o ficha para Viaje/Evento/Anticipo/Compartido rechazada.
- **Ficha duplicada:** unicidad por REF; 409/rollback; no segunda ficha.
- **Tipo Vehículo:** cualquier cambio de Tipo hacia o desde `Vehículo` se bloquea en
  E3.3; no se crea ni se borra una ficha desde el cambio de Tipo. La única vía de alta
  es la operación atómica de vehículo. Una conversión excepcional exigirá un
  procedimiento explícito fuera de esta entrega.
- **Integridad de lectura:** REF Vehículo sin ficha o ficha con Tipo incorrecto se
  muestra como incidencia/«Revisar»; no se auto-repara.
- **Duplicados de nombre/matrícula:** coincidencia exacta o por clave efímera de
  presentación (trim + minúsculas) solo para el aviso; no se guarda la clave normalizada.
  Confirmación explícita; nunca fusión.
- **Gasto año:** un Gasto de otra REF no cuenta; un Gasto con REF Vehículo y cualquier
  Partida sí cuenta; anulados no cuentan; rectificados reevalúan; no doble cómputo.
- **Cambio de ejercicio:** diciembre/enero y Ciclo distinto no arrastran; ITV no mueve
  el gasto; año futuro no es 0 verificado.
- **Cobertura:** total solo con cobertura verificable; parcial muestra subtotal;
  ausencia no es 0; fuente caída no borra identidad/fechas.
- **Inactividad:** ficha e histórico visibles; no nuevos enlaces; reactivar no crea
  hechos.
- **Concurrencia:** revisión obsoleta 409; respuesta antigua no reemplaza el año nuevo.
- **Seguridad:** MFA/CSRF/Origin; sin DELETE; sin SQL/payload en logs; sin datos reales.

## 11. Exclusiones
Base B y Compartidos; D5/Exterior y aportaciones externas; Comida; B3/Dev32; seguros
personales como módulo; activos inmobiliarios; marca/modelo/kilometraje; historial
1:N de ITV; recordatorios, notificaciones o automatización externa; planificación,
Presupuesto o cuotas; importación histórica; módulo Navidad; SQL/DDL; desarrollo15;
datos reales; publicación o merge.

## 12. Criterios de aceptación
Diseño de prueba; ninguno ejecutado. Los positivos usan datos ficticios. La aprobación
de esta tabla no autoriza implementación.

| ID | Acción / precondiciones | Resultado observable esperado |
| --- | --- | --- |
| AC-01 | Alta de vehículo con nombre y datos opcionales | REF Vehículo Activa y ficha 1:1 creadas en una transacción; ID estable; sin huérfanos |
| AC-02 | Fallo en cualquier paso del alta; reintento con la misma clave | Rollback completo; sin REF/ficha parcial; reintento no duplica |
| AC-03 | Intentar ficha para REF Viaje/Evento/Anticipo/Compartido | Rechazo de tipo incorrecto; sin ficha creada |
| AC-04 | Intentar una segunda ficha para la misma REF, incluso en dos procesos | Una sola ficha; duplicado rechazado sin estado parcial |
| AC-05 | Intentar cambiar el Tipo de una REF existente a Vehículo o crearlo por el alta genérica de Referencias | Bloqueo; no se crea ficha automáticamente; la vía válida es el alta atómica de vehículo |
| AC-06 | Cambiar Tipo de una REF que ya tiene ficha de Vehículo | Bloqueo; ficha e historia intactas; no hay borrado/recreación automática |
| AC-07 | Leer REF Vehículo sin ficha o ficha con REF de otro Tipo | Incidencia «Revisar»/No disponible; sin auto-reparación ni escritura |
| AC-08 | Renombrar la Referencia | Mismo REFxxx, enlaces e historia; Gasto año sin cambio; auditoría |
| AC-09 | Crear/editar/limpiar matrícula opcional | Se conserva o queda «Sin informar»; sin unicidad global; auditoría |
| AC-10 | Crear/renombrar con nombre o matrícula coincidente | Aviso con coincidencias; sin bloqueo por unicidad; confirmación explícita crea; no fusiona |
| AC-11 | Desactivar y reactivar una REF con ficha e historial | Ficha e historia conservadas; sin nuevos enlaces mientras inactiva; sin hechos nuevos al reactivar |
| AC-12 | Alta sin próxima ITV ni cita; después informar una sola | Ambas ausentes como «No informada»; independencia; la cita vacía es válida |
| AC-13 | Editar fechas pasadas/futuras, limpiar una y conservar la otra | Fechas civiles válidas; sin cálculo de periodicidad; PATCH omitido conserva; null limpia; auditoría |
| AC-14 | Varios Gastos con la REF, Partidas distintas | Todos cuentan una vez; suma exacta; sin filtro por Categoría/Partida |
| AC-15 | Gastos de otra REF, Ingresos, Transferencias, Amortizaciones, Presupuesto y anulados | No cuentan; no se mezcla planificación; originales intactos |
| AC-16 | Gasto de diciembre con Ciclo de enero; ITV en otro año | Pertenece al año de su Fecha real; la ITV no mueve el gasto; sin arrastre |
| AC-17 | Abrir ficha y cambiar el selector de ejercicio | Inicializa en el año natural actual; recalcula solo el año elegido; pasado/futuro consultables |
| AC-18 | Ejercicio con cobertura incompleta y hechos conocidos | «Parcial», subtotal registrado y motivo; `total` no se presenta como completo |
| AC-19 | Ejercicio verificable sin Gastos; año futuro sin cobertura | Cero verificado solo en el primero; el futuro no se presenta como 0 verificado |
| AC-20 | Rectificar o anular un Gasto vinculado | El Gasto año se recalcula una vez; el original se conserva; sin doble cómputo |
| AC-21 | Renombrar o desactivar la REF y consultar años anteriores | ID y totales históricos se conservan; no se reescriben hechos |
| AC-22 | Inspeccionar persistencia y fuentes del Gasto año | Solo Movimientos como fuente de Gastos; sin tabla de totales, hechos duplicados ni maestro alternativo |
| AC-23 | API sin sesión, sin CSRF, revisión obsoleta, payload inválido, replay o intento de DELETE | Rechazo seguro; 404/409/422 sin datos sensibles; idempotencia, sin DELETE y sin escritura parcial |
| AC-24 | Cambio rápido de ejercicio/ficha con respuesta antigua | La respuesta antigua no sustituye la selección vigente; filtros y borrador se conservan |
| AC-25 | UI 390/1440 de listado, ficha y alta | Etiquetas completas, foco/teclado, contraste, estados y acciones accesibles; sin depender del color |
| AC-26 | Listado vacío, carga, error de fuente y reintento | Estados explícitos; sin filas/importes ficticios; la ficha conserva identidad/fechas si falla el anual |
| AC-27 | Consultar Viaje/Evento y un Gasto CAT009 sin REF | Viaje/Evento siguen sin ficha; CAT009 sin REF sigue permitido; no se fuerza crear vehículo |
| AC-28 | Revisar alcance y dependencias | Sin Base B, D5/Exterior, Comida, B3/Dev32, un maestro alternativo de vehículos, hechos duplicados ni módulo Navidad |
| AC-29 | Consultar auditoría de ficha y Referencia | Cambios de nombre/matrícula/fechas con actor, UTC y antes/después; sin DELETE ni historia reescrita |
| AC-30 | Intentar corregir fechas/importes desde la ficha | La ficha no edita Gastos ni importes; solo enlaza a Movimientos; no se duplican hechos |

### Trazabilidad
| Criterio de roadmap | Criterios de esta specification |
| --- | --- |
| E3.3-AC1: una ficha por Referencia Vehículo, ID estable | AC-01–AC-11, AC-27, AC-29 |
| E3.3-AC2: Gasto año solo de Gastos reales vinculados y ejercicio | AC-12–AC-22, AC-30 |
| E3.3-AC3: Viaje/Evento sin ficha; sin módulo Navidad | AC-27, AC-28 |
| Transversales de integridad, API y UI | AC-02, AC-07, AC-23–AC-26 |

## 13. Pendiente antes de aprobar
- Revisión y aprobación expresa de esta specification y de los wireframes W1–W4.
- Confirmar que la precisión de Q3 se aplica como bloqueo de cualquier cambio de Tipo
  hacia o desde `Vehículo` en E3.3, sin creación, borrado ni recreación automática de
  la ficha. Una conversión excepcional queda fuera de esta entrega y requerirá decisión
  explícita.
- Confirmar que la cobertura parcial se presenta como subtotal registrado y nunca como
  total completo, reutilizando el contrato de E2.4.
- Tras la aprobación, el desarrollo15 seguirá necesitando autorización separada; no se
  incluye SQL, migración, datos reales, push de publicación ni merge.
