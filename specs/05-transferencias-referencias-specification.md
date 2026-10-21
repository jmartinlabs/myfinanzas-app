# 05 — E1.5 Transferencias y Referencias: Specification
Status: DRAFT — NO APROBADO. Q1–Q3 confirmadas; revisión final del documento/diseño pendiente.
Approval source/date: PENDING. La autorización de redactar/publicar no aprueba el contenido.
Context and brainstorming: [ronda única](05-transferencias-referencias-brainstorming.md),
[roadmap](roadmap.md), [R1–R4/P2](functional-reference-v5.11.md),
[contratos AC-30/31 E1.4](04-movimientos-testplan.md).
Base: main a693aeb; 2026-10-21. Solo documentación, ejemplos ficticios y entorno local.

## Functionality
Ampliar el registro único de Movimientos con Transferencia y habilitar un maestro único
mínimo de Referencias Viaje/Evento. Reutilizar Saldos, Clasificación, Ciclos y seguridad.
No crear otra tabla de hechos por terminal ni convertir financiación en compra o ingreso.

### Autoridad y dependencias
| Regla | Procedencia / estado |
| --- | --- |
| Dos Saldos distintos, sin Partida, sin Ingreso/Gasto económico | R2/roadmap confirmado |
| Financiación terminal por Transferencia interna, compra por Gasto desde terminal | R2 confirmado |
| REFxxx estable, nombre editable, enlaces por ID | P2 aprobado para app, no ID físico Excel demostrado |
| Viaje/Evento sin ficha; otros tres tipos requieren ficha E3 | R1/R4 y roadmap aprobado |
| Categoría derivada de Partida; mapping exigible solo con Referencia obligatoria | E1.2 y Q2 confirmada, matriz contrastada abajo |
| Internas entre activos distintos/elegibles, sin permiso Exterior; no exclusión automática Terminal/No controlado | Q1 confirmada por usuario; Exterior completo reservado |
| Bloqueo de fechas futuras de Transferencia, Europe/Madrid en cliente/servidor | Q3 aprobada como decisión nueva de app, no regla física Excel |
| Activos/nombres/Tipo protegido/estados REF | Propuestas app de esta especificación, no reglas Excel atribuidas |
| Importes y precisión, auditoría, anulación, idempotencia | Reutilizar contrato y controles de registro E1.4 |

AC-30 de E1.4 se cubre solo para Referencias habilitadas y mapping demostrado; fichas,
Anticipo/Compartido/Vehículo y reglas particulares quedan pendientes. AC-31 solo añade
Transferencia, no Amortización/deuda/inversión. No marcar completos ambos contratos globales.
E1.4 AC-32/33 siguen fuera. E1.3 sigue con fuentes Comida/inversión pendientes.

### Transferencias y posiciones
Una Transferencia es UN Movimiento con UN ID y dos relaciones a Saldos. Importe EUR
estrictamente positivo, sin Subtipo ingreso ni Partida. Concepto/Nota libres, nunca clasificadores.
Q1 confirmada: altas internas entre dos Saldos activos distintos y elegibles; admitir Terminal
para financiación y No controlado sin un veto general por Tipo/Control. Manual sigue no operativo.
No seleccionar S000 en ningún extremo de Transferencias E1.5. TODAS las Transferencias
con Exterior se reservan para una entrega posterior, incluidas las ordinarias y las
variantes E3; no quedan habilitadas por carecer de Referencia o no ser casos especiales.
Permiso de salida a Exterior se mantiene obligatorio en Gasto desde terminal u otro Saldo;
no se aplica a Transferencias internas, según Q1; no copiarlo del formulario Gasto.

Motor central Control Movimientos: apertura (ausente contribuye cero solo en cálculo)
+ entradas vigentes − salidas vigentes. Transferencia resta origen y suma destino si cada
posición dispone de ese motor. Sin filtro Fecha apertura ni escritura de saldo acumulado.
Entre dos Saldos de Control Movimientos, suma de posiciones invariante. No afirmar esa
suma computable si uno es Terminal/No controlado/Inversiones ni mostrar cero o saldo parcial.
Efectivo de bróker puede recibir hechos elegibles, sin declarar entregado el motor Inversiones.

Ejemplo determinista: Banco A/B con aperturas 100,00/20,00; transferencia 30,00 → 70,00/50,00,
total 120,00. Ejemplo terminal: Banco A 100,00, transferir 30,00 al terminal → Banco A 70,00;
Gasto terminal a S000 12,00 con Partida válida registra gasto 12,00, sin otro cargo Banco A.
Terminal continúa sin posición convencional. No generar Gasto 30,00 ni ingreso de financiación,
ni limitar el Gasto por una posición terminal que no se calcula. No saldo mínimo inventado.

Fecha civil, asignación al intervalo de Ciclos y máximo financiero de Movimientos reutilizan
el servicio único: Transferencia vigente participa; rectificar/anular puede retroceder referencia.
Sin ciclo asignable permitido, Fin temporal distinto de cierre. Q3 bloquea fechas futuras
de Transferencia usando el día civil Europe/Madrid en cliente y servidor;
no usar el reloj para decidir ciclo actual/corte ni duplicar la fecha de referencia.

### Referencias mínimas y Gastos obligatorios
Alta/consulta/renombrado y propuesta de desactivación/reactivación. Tipo obligatorio entre
Viaje/Evento operativos. Los cinco tipos de dominio se documentan, pero Anticipo, Gasto
compartido y Vehículo no tienen alta/selector funcional hasta E3; no fichas vacías de relleno.
ID REF visible e inmutable, nombre obligatorio y editable como presentación. No regla nueva
de unicidad de nombres ni normalización silenciosa; IDs distinguen homónimos en el selector.
Propuesta de Estado Activa inicial; inactivas no elegibles para nuevos enlaces, sí históricas.
Reactivar no crea operaciones ni modifica hechos. Sin DELETE físico, incluso referencias sin uso.

### Matriz contrastada y aplicación exacta de Q2
Evidencia sanitizada aportada por el usuario tras revisión de Álex del Excel; Codex no
ha inspeccionado el libro. La matriz no autoriza crear estos maestros al iniciar la app.
| Categoría ID | Tipo esperado | Referencia | Disponibilidad E1.5 |
| --- | --- | --- | --- |
| CAT011 | Viaje | Obligatoria | Operativa con REF Viaje válida |
| CAT012 | Anticipo | Obligatoria | Bloqueada por dependencia E3.1 |
| CAT013 | Gasto compartido | Obligatoria | Bloqueada por dependencia E3.2 |
| CAT014 | Evento | Opcional | No endurecer compatibilidad opcional |
| CAT009 | Vehículo | Opcional | Sin exigir REF; tipo Vehículo no operativo hasta E3.3 |

Toda Referencia informada debe existir, también si es opcional. Si la Categoría exige
Referencia, validar Tipo y compatibilidad por ID según esta matriz. Si no la exige,
NO rechazar una REF operativa por no coincidir con el Tipo sugerido por la matriz:
por ejemplo, CAT014 con REF Viaje o CAT009 con REF Evento no se invalidan por ese motivo.
CAT009 sin REF es válida; no obligar a crear un Vehículo ni una ficha. CAT012/CAT013
no se desbloquean con un Viaje/Evento ni con texto provisional. No/vacío histórico
mantiene la semántica E1.2, sin convertir ausencia a false ni suponer un mapping nuevo.
En Ingreso/Transferencia sin Partida no inventar Categoría para forzar compatibilidad:
REF opcional operativa existente, sujeto a restricciones particulares de su Tipo.
Restricciones independientes confirmadas: Anticipo solo Transferencia; Gasto compartido
admite Gasto o Transferencia, con origen Exterior y Quién paga cuando es Transferencia.
En E1.5 permanecen BLOQUEADOS esos Tipos y Vehículo hasta disponer de sus fichas E3,
aunque la Referencia fuese opcional. Ningún selector, payload ni alta de catálogo puede
eludirlo. La Transferencia compartida exterior tampoco se habilita como caso especial.
No se implementan ahora Quién paga, participantes ni ficticios datos de ficha.
Mapping único por IDs Categoría–Tipo, nunca nombre mutable; no copiar Categoría/Subcategoría
ni Tipo REF al Movimiento como fuentes económicas paralelas. Las cinco filas contrastadas
no demuestran una cardinalidad universal para futuras reglas ni habilitan un editor genérico.
La futura migración de datos verificará IDs/mapping sin crear CAT011 u otras Categorías
artificiales; pruebas usarán fixtures sanitizados explícitos. Nuevas reglas de compatibilidad
opcional requerirían aprobación: no introducirlas bajo pretexto de integridad técnica.

Al editar un Gasto se revalidan las relaciones y la obligación con el procedimiento auditado
existente. Los Gastos que exigen tipos de E3 siguen bloqueados y explican la dependencia.
Consulta de uso incluye hechos vigentes y anulados, con filtros/IDs; cifras y auditoría
pertenecen a Movimientos. Renombrar REF conserva enlaces, nombres vigentes en consultas vivas;
la evidencia anterior de auditoría no se reescribe. Fotografías futuras conservarán lo capturado.
Propuesta simple: cambio de Tipo sin uso permitido con revisión/auditoría; usado por cualquier
hecho, incluso anulado, se bloquea. No reclasificación silenciosa ni versionado general;
una futura rectificación excepcional requiere especificación e impacto completos.

### Rectificación, anulación e integridad
Reutilizar preview → confirmación, motivo y evidencia antes/después bajo transacción. Un
cambio de origen/destino afecta ambos lados atómicamente; anular excluye el único hecho
sin crear otro inverso. Una devolución real requiere operación real, no falsa anulación.
Mismo ID, sin DELETE ni reactivación del hecho anulado. No introducir otra ruta que eluda
auditoría, origen/CSRF, huella de impacto o idempotencia. Extender cambios de Tipo por el
procedimiento existente solo tras validar TODOS los campos del nuevo Tipo y mostrar ambos
lados/Referencias antes/después; no conversión automática al cambiar un selector de formulario.
Enlaces históricos inactivos conservados cuando no se sustituyen, revalidación coherente
con E1.4; nuevos enlaces deben ser elegibles. Catálogos y mapping usados participan en la
huella; cambio concurrente tras preview produce 409, sin guardar estado inválido.
Cambios de clasificación que pasan a exigir Referencia revisan hechos afectados con el mismo
validador real, no solo el formulario nuevo. Auditoría de hechos no duplica otra contabilidad.
Duplicados económicos: advertencia revisable, nunca unicidad de contenido. Firma Transferencia
incluye Tipo, fecha, importe, origen/destino, REF y contenido relevante documentado; dos hechos
genuinos pueden confirmarse. Reintento técnico conserva una sola operación y resultado.
Guards de cierre siguen contrato futuro, sin aparentar que cierres de E4 están instalados.

## Data model and contracts
Modelo lógico y propuesta técnica, SIN SQL/DDL/migración generados en spec 05.
| Objeto | Datos persistentes propuestos | Derivados / garantías |
| --- | --- | --- |
| Referencia | REFxxx PK, nombre, Tipo, Estado, revisión/UTC | ID servidor atómico, sin reutilización, continúa REF1000; no clave interna extra |
| Movimiento existente | Ampliar Tipo a Transferencia, origen/destino; relación REF opcional según regla | Un hecho y mismo ID, no tabla de transferencias ni contador separado |
| Auditoría / intentos existentes | Antes/después, motivo/UTC/actor; key/payload/resultado | Extender mecanismo existente, sin reiniciar ni reinterpretar intentos previos |
| Mapping Categoría–Tipo REF | Representación única de las cinco filas confirmadas Q2 | No deducción por nombre ni compatibilidad opcional adicional |
| Posición, ciclo, fecha financiera y usos | No copia persistida paralela | Servicios centrales leen hechos vigentes completos, no solo página/filtros |

EUR integer exacto y JSON decimal string, fechas económicas civiles y UTC técnico.
Misma arquitectura React/TypeScript/Vite, Bun/Effect HTTP/bun:sqlite, SQL directo, sin ORM
ni dependencia nueva propuesta. La implementación futura decidirá el DDL ordinario necesario
tras aprobar reglas; no tabla de módulos E3 anticipada. FK, CHECK y triggers de identidad/no
DELETE donde corresponda; validación de negocio también en servidor, sin fiarse del cliente.

Upgrade desde v4 genuina con Saldos/clasificación/Ciclos/hechos/auditorías/acceso existentes:
transacción versionada, rollback ante fallo, sin reseed, borrar/recrear datos ni convertir
operaciones previas a Transferencia. Si se reconstruye una tabla por CHECK, preservar IDs,
filas, FK, triggers, índices y auditorías verificando equivalencia; no destruir historial.
Hechos E1.4 sin Referencia siguen ausentes, no enlace ficticio ni backfill automático.
Versión desconocida intacta, dos procesos coordinados y snapshots consistentes. Actualizar
in situ preserva acceso; restore age sigue revocando sesiones según política existente.

## Screens and interfaces
Propuesta nueva, NO APROBADA; incorpora Q1–Q3 confirmadas. Transferencia solo ofrece
Saldos internos elegibles y no exige permiso Exterior. Fecha económica indica «No posterior
a hoy (España)» y max procede del contrato servidor; validación también en servidor.
Gasto muestra «Referencia obligatoria» o «Referencia opcional» según Categoría, sin limitar
Tipos opcionales por el mapping. Solo Viaje/Evento operativos en selectores.
Reutiliza shell/menú/cabecera, tokens claros, texto oscuro
sobre #8DBB2E, PageHead/Alert/Tag, tabla/tarjetas y formularios en página propia. Sin librería.
No pruebas visuales ni capturas nuevas: esquemas previstos a 1440/390 px para revisión.

### Escritorio — Movimientos y nueva Transferencia (1440 px)
```text
┌ MyFinanzas ┬ Ciclo financiado: [contexto real central] ─────────────────────┐
│ Saldos     │ Movimientos                       [+ Nuevo movimiento]        │
│ Clasific.  │ Buscar [____] Tipo [Transferencia ▾] Ciclo [Todos ▾]          │
│ Ciclos     │ Estado [Vigentes ▾] Referencia [Todas ▾] [Más filtros]         │
│ Movim.     │ Fecha      Concepto       Origen → Destino    REF     Importe │
│ Referenc.  │ 12/10/2026 Financiación    Banco A → Terminal  —       30,00 € │
│            │ [Ficha del hecho: ID, enlaces, auditoría, rectificar/anular]  │
├────────────┼──────────────────────────────────────────────────────────────┤
│            │ Nueva Transferencia                                          │
│            │ Identificación: Fecha [__/__/____] Tipo [Transferencia ▾]    │
│            │ Operación: Origen [____ ▾] → Destino [____ ▾] Importe [___]   │
│            │ Contexto: Referencia [Sin referencia ▾]  Concepto [_______]  │
│            │ Nota [__________________]                                    │
│            │ Sin Partida/Subtipo; REF opcional existente Viaje/Evento.   │
│            │ [Cancelar]                           [Revisar transferencia] │
└────────────┴──────────────────────────────────────────────────────────────┘
```
Revisión: origen/destino, importe, REF si corresponde, ciclo/fecha financiera y efectos
antes/después de ambos Saldos; motivo si rectificación y advertencia duplicado revisable.
Terminal/otros motores muestran «Sin posición calculable», no importe provisional.

### Escritorio — Referencias y ficha (1440 px)
```text
Referencias                       [+ Nueva referencia]
Buscar [____] Tipo [Todos ▾] Estado [Activas ▾]
ID       Nombre          Tipo       Estado    [Ver]
REF001   Escapada demo   Viaje      Activa    [Ficha]

Escapada demo · REF001                         [Editar]
Identificación: Nombre / Tipo Viaje / Estado Activa
Movimientos vinculados [Vigentes/Anulados/Todos] [Abrir consulta filtrada]
Sin ficha específica: Viaje/Evento. Sin Neto/Pendiente ni cierre inventados.
[Desactivar / Reactivar] con confirmación y efecto en nuevas selecciones.
Formulario propio: Nombre [____] Tipo [Viaje/Evento ▾] [Cancelar] [Guardar]
Tipo usado: solo lectura y explicación. ID asignado por servidor al alta.
```

### Móvil — mismos flujos (390 px)
```text
┌ MyFinanzas                  [Menú] ┐
│ Ciclo: [contexto real]             │
│ Movimientos             [+ Nuevo] │
│ Tipo [Transferencia ▾] [Filtros]   │
│ 12/10/2026             30,00 €     │
│ Banco A → Terminal · Vigente      │
│ Referencia: Sin referencia [Ver]  │
├───────────────────────────────────┤
│ Nueva transferencia               │
│ Fecha [__/__/____]                │
│ Origen [Seleccionar ▾]            │
│ Destino [Seleccionar ▾]           │
│ Importe EUR [____]                │
│ Referencia [Sin referencia ▾]     │
│ Concepto [____]  Nota [____]      │
│ [Cancelar] [Revisar]              │
├───────────────────────────────────┤
│ Referencias             [+ Nueva] │
│ Buscar [____] [Filtros]           │
│ Escapada demo · Viaje             │
│ REF001 · Activa          [Ficha]  │
│ Ficha: datos / [Editar]           │
│ [Movimientos vinculados]          │
│ [Desactivar]                      │
└───────────────────────────────────┘
```
Formulario Gasto existente: añade selector REF cuando aplicable, obligación visible
según Categoría derivada: CAT011 exige Viaje; CAT014 permite REF operativa opcional
sin compatibilidad adicional. CAT012/CAT013 y tipos que exigen ficha E3: aviso bloqueante,
sin botón de crear caso incompleto. Acceso a crear Viaje/Evento en página propia y
vuelta conservando borrador; no altas implícitas al escribir un nombre. Selectores
muestran nombre + Tipo/ID cuando necesario para distinguir homónimos.
Listados/fichas permiten filtro por REF ID, consultar anulados e inactivos; no dashboards
E3 ni total económico ambiguo que mezcle Transferencia con Gasto o doble conteo.

## Empty, loading and error states
- Catálogo vacío: CTA crear Viaje/Evento, sin datos de relleno. Sin Saldos elegibles:
  explicar dependencia/configuración, no crear automáticamente ni usar S000.
- Carga/error de opciones o contexto: estados distintos, reintento sin perder borrador;
  no sustituir ausencia/error por cero, «Sin referencia» o cabecera calculada desde reloj.
- 422: campo y regla precisos, foco asociado; 409 por contexto/revisión/clave idempotente:
  conservar borrador y pedir nueva revisión, nunca sobrescribir. 404 distingue ID inexistente.
- 401: flujo MFA existente y conservación local del borrador según patrón E1.4; no bypass.
- Duplicado: vista de hechos coincidentes y confirmación de otro hecho real; no bloqueo
  automático por contenido. Error de red tras commit: mismo intento, sin doble escritura.
- Referencia inactiva histórica se identifica como tal; no reemplazar al abrir/guardar
  otro campo. Tipo E3 o obligación no verificable mantiene bloqueo con explicación accionable.
- Teclado/foco/labels/contraste/no overflow; campos y confirmación no dependen solo del color.

## API behavior and external dependencies
Propuesta de rutas, no endpoints implementados: extender /api/movimientos y sus rutas
actuales de opciones, consulta, impacto, rectificar/anular. Proponer /api/referencias para
listado/alta, /:id para ficha/edición y operación de Estado usando patrón de catálogo.
No DELETE ni API genérica para cambiar FK/Tipo o confirmar sin vista previa. Filtros REF,
origen/destino y Tipo preservan paginación/orden estable; no nueva API pública.
Lecturas coherentes; servidor deriva jerarquía/ciclo/posiciones y rechaza campos derivados.
Toda mutación requiere sesión MFA, Origin/CSRF, revisión/huella e idempotencia según acción;
reserva de ID, validación, hecho, auditoría e intento en una transacción IMMEDIATE. Las dos
posiciones leen el mismo snapshot, nunca actualizaciones independientes por cada Saldo.
Errores genéricos con requestId sin SQL/datos/factores en logs. Mismo límite JSON/seguridad.
Sin servicio externo ni integración bancaria; matriz funcional sanitizada confirmada Q2.

## Validation and edge cases
Q1–Q3 resueltas por confirmación del usuario; no nuevas reservas financieras abiertas.
IDs/fecha válida/importe positivo/activos/distintos, inexistentes/inactivos/Manual y payload
con Partida/Subtipo no aplicables; comprobar pertenencia por ID, no por nombre. No límite
de fondos disponibles ni dependencia de una posición Terminal inexistente. Compatibilidad
REF exigida solo por obligación confirmada, sin quitar tildes/espacios ni inventar unicidad de nombre de casos.
Cambio de Tipo o REF con uso revisa dependencias reales del registro y no modifica cierres
ni fotografías futuras. Integridad de referencias también en rectificación de clasificación.
Ninguna rama del servicio puede saltarse validación por usar un endpoint heredado de E1.4.

## Exclusions
Sin dev 05, SQL, migración ejecutada, datos reales, Excel, merge o despliegue en esta fase.
En desarrollo posterior tampoco se adelantan: fichas/motores Anticipo/Compartido/Vehículo,
participantes/Quién paga, Neto/Reparto/Pendiente/Exceso, ITV, referencias huérfanas, nuevo
maestro por módulo, Navidad, aportación presupuestaria E2.2, reposiciones Comida o compras
inversión, Amortización E1.6, cierres/fotos E4, migración/mapping de nombres reales P6/P7,
backup externo/scheduler/producción. Viaje/Evento no reciben ficha por analogía con E3.

## Acceptance checks
Pruebas PREVISTAS, NO ejecutadas. I = candidato implementable en E1.5 tras aprobación;
C = contrato futuro, no computar como verificado. Q1–Q3 resueltas; ningún AC condicionado.
No confundir esta clasificación con los 29 PASS ya integrados de E1.4.
| ID | Acción / precondición | Resultado observable esperado | Prueba prevista | Clase |
| --- | --- | --- | --- | --- |
| AC-01 | Alta Transferencia entre dos Saldos elegibles distintos | Un hecho/ID, sin Partida/Subtipo ni ingreso/gasto económico | Bun/API + UI | I |
| AC-02 | Banco A/B 100/20; transferir 30 | Posiciones 70/50, suma120, sin doble asiento ni acumulado persistido | Bun exactitud + E2E | I |
| AC-03 | Origen=destino; ID inexistente/inactivo/Manual; payload derivado | Rechazo íntegro; S000 bloqueado en ambos lados aun sin REF; Terminal/No controlado no excluidos automáticamente | Bun/API | I |
| AC-04 | Transferir30 a terminal; Gasto12 desde terminal | Banco reduce solo30, gasto12; terminal no muestra posición convencional ni compra bancaria duplicada | Bun + UI | I |
| AC-05 | Gasto terminal sin permiso Exterior; transferencia interna | Gasto bloqueado; Transferencia interna admisible sin permiso Exterior, si ambos extremos elegibles | Bun/API | I |
| AC-06 | Cero/negativo/tercer decimal/null, importes límite | Rechazo exacto, sin float/default/redondeo; positivo válido | Bun/API | I |
| AC-07 | Aportar fondos a saldo con otro motor | Efecto de hecho válido sin presentar saldo incompleto como posición calculada | Bun/UI | I |
| AC-08 | Fecha anterior a apertura/primer ciclo; límites Inicio/Fin | Saldo sin filtro apertura, ciclo maestro o Sin ciclo asignable | Bun + UI | I |
| AC-09 | Hoy/mañana y medianoche Madrid/DST | Hoy permitido/mañana rechazado en cliente/servidor Europe/Madrid, también en medianoche/DST; Ciclos futuros y referencia intactos | Bun servidor/UI | I |
| AC-10 | Rectificar/anular Transferencia de fecha máxima | Recalcula máximo y cabecera desde vigentes, puede retroceder/null | Bun + E2E | I |
| AC-11 | Crear Viaje y Evento; intentar tipo E3 o Navidad | REF estable habilitada solo para los dos tipos, sin ficha huérfana | Bun/API/UI | I |
| AC-12 | Dos altas concurrentes y después de REF999 | IDs distintos atómicos/no reutilizados, REF1000, fallo sin hueco por commit parcial | Bun procesos | I |
| AC-13 | Renombrar REF utilizada y consultar hechos/auditoría | Mismo ID/enlaces, nombre vigente en consulta, evidencia previa intacta; homónimos identificables por ID | Bun + UI | I |
| AC-14 | Desactivar/reactivar REF usada | Historia intacta, sin DELETE; no nuevas selecciones inactivas, no creación de hechos al reactivar | Bun/API/UI | I |
| AC-15 | Cambiar Tipo de REF con/sin uso, incluido anulado | Propuesta app: permitir sin uso; bloquear usada, sin reclasificación silenciosa/versionado | Bun/API | I |
| AC-16 | Gasto CAT011 obligatorio: sin REF, inexistente, Evento o Viaje existente | Ausente/inexistente/Evento bloqueados; Viaje válido por ID, sin depender de nombre Categoría/REF | Bun/API/UI | I |
| AC-17 | CAT014/CAT009 y No/vacío histórico: sin REF, inexistente y REF operativa de otro Tipo; Ingreso/Transferencia con REF opcional | Sin REF válido; inexistente rechazado; REF Viaje/Evento existente no se rechaza por mapping opcional; sin Categoría inventada ni vacío→false | Bun/API | I |
| AC-18 | CAT012/CAT013 obligatorias; intentar Anticipo/Compartido/Vehículo también opcionales | Casos que dependen de E3 bloqueados en UI/API; CAT009 sin REF sigue válido; no fichas de relleno | Bun/UI | I |
| AC-19 | Consultar REF y filtrar Movimientos | Solo hechos por ese ID, paginación/estado/anulados correctos, sin sumatorio económico mixto | API/E2E | I |
| AC-20 | Rectificar importe/dirección/REF o Tipo del hecho con motivo | Mismo ID, reglas completas nuevo Tipo, impacto ambos lados/referencia/ciclo y auditoría atómica | Bun/API/UI | I |
| AC-21 | Anular error que no representa hecho real y reintentar | Mismo ID sin cómputo; ambos lados revertidos en cálculo, consultable, no DELETE ni transferencia compensatoria | Bun/E2E | I |
| AC-22 | Dos hechos idénticos genuinos; respuesta perdida tras commit | Advertencia aceptable genera dos IDs; reintento técnico del mismo intento genera solo uno | Bun procesos/E2E | I |
| AC-23 | Catálogo/mapping/hecho cambia tras preview; fallo auditoría | 409 o rollback total, sin enlace incompatible ni mitad de efectos | Bun concurrencia/API/UI | I |
| AC-24 | Rectificar categoría para exigir Tipo REF incompatible con hechos | Dependencias reales y bloqueo/impacto comprobable, no solo catálogo ni consumidores simulados | Bun/API | I |
| AC-25 | Acceder sin MFA o mutar sin Origin/CSRF, manipular campos | Rechazo servidor, sin fuga SQL/factores ni ruta alternativa | Bun HTTP/regresiones | I |
| AC-26 | Recorrer listado/ficha/formularios/preview a390/1440 y teclado | Tabla/tarjetas, foco, labels, contraste y sin overflow; capturas reales inspeccionadas solo en dev | Playwright/revisión visual | I |
| AC-27 | Vacío/carga/error/404/422/409/401 y reintento | Estados distintos, borrador preservado y sin datos ficticios como sustitución | E2E/API | I |
| AC-28 | Upgrade base genuina v4, fallo DDL, dos arranques | Conserva datos/IDs/auditoría/intentos/acceso, rollback íntegro, versión desconocida intacta, sin reseed | Bun integración/procesos | I |
| AC-29 | Snapshot age del nuevo esquema y restore aislado | Datos/posiciones/REF coherentes; MFA/login reales, sesiones revocadas según política; no dependencia externa | Bun + E2E | I |
| AC-30 | Ejecutar suite E1.1–E1.4 tras extensión | Sin regresiones de identidad/seguridad/fecha/saldos/ciclos, 29 AC E1.4 conservados salvo dependencia ahora satisfecha explícitamente | Bun + Playwright | I |
| AC-31 | Entrega posterior habilita Transferencias Exterior y fichas E3 | Exterior ordinario y especial fuera de E1.5; Anticipo solo Transferencia; Compartido Gasto o Transferencia con origen Exterior y Quién paga; REF–ficha/participantes coherentes, sin huérfanos | Pruebas futuras de ampliación Exterior/E3.1–E3.3 | C |
| AC-32 | Consumidores plan/inversión/deuda/Comida | Efectos según su motor, sin doble ejecución ni cambiar Tipo económico; AC-31/33 E1.4 no completos por E1.5 | Pruebas futuras E2/E3/E4/E1.6 | C |
| AC-33 | Cierre/foto/migración autorizada reales | Protección transversal y fotos inmutables, mapping auditado nombres→IDs, sin reescribir Excel | Pruebas futuras E4/P6/P7 | C |

30 criterios actuales previstos (AC-01–30) y 3 contratos futuros (AC-31–33). No PASS de E1.5.
Antes de dev: revisión final y aprobación expresa de especificación/wireframes completos.
Tras futura autorización dev: implementación y evidencias en progress/testplan propios;
no crear aquí resultados, capturas, esquemas ejecutables ni estado de implementación.
