# 04 — E1.4 Movimientos: Specification
Status: APPROVED — especificación completa y wireframes aprobados el 21/10/2026.
Approval source/date: aprobación expresa del usuario tras revisión favorable de Álex, 2026-10-21 (21/10/2026). Q1–Q6 confirmadas; publicación y squash merge de PR #14 autorizados. Sin dev 04.
Context and brainstorming: [ronda única](04-movimientos-brainstorming.md),
[roadmap E1.4](roadmap.md#e14--registrar-ingresosgastos-y-consultar-posición-general),
[R2/P4/P5](functional-reference-v5.11.md), [UI aprobada](guidelines/ui.md).
Base comprobada: main ff9d18d, PR #13 MERGED; React/Bun/Effect/SQLite existentes.
La aprobación de E1.3 está registrada en su PR y commit de squash; estados de revisión
anteriores de sus documentos son históricos. Excel v5.11 sigue maestro, fuera de Codex.

## Functionality
Registrar, consultar y rectificar Ingresos/Gastos reales del dominio con fixtures
exclusivamente ficticios en esta fase. No planificación, previsión, simulación ni
cobro automático de Nómina. Un Ingreso de subtipo Nómina es un hecho: no entrega E2.5.
Crear/consultar desde páginas propias; rectificación económica diferenciada de alta,
con vista previa, motivo y confirmación. Anulación lógica aprobada, sin borrado físico.

### Autoridad y límites
| Regla | Estado/fuente |
| --- | --- |
| Ingreso: S000→Saldo receptor, Subtipo Nómina/Bonus/Intereses/Promoción obligatorio, sin Partida | Confirmado R2/solicitud |
| Gasto: Saldo origen→S000, Partida y salida permitida a Exterior | Confirmado R2/solicitud |
| Categoría/Subcategoría derivadas de Partida; Gasto válido sin Presupuesto | Confirmado R1/E1.2 |
| Concepto/Nota son texto libre y no modifican Tipo/clasificación | Confirmado R1/R2 |
| Saldos activos y clasificación activa para nuevas selecciones; histórico conserva inactivos | Contratos E1.1/E1.2, no regla inventada del Excel |
| Elegibilidad de Saldos | Q1 confirma reglas vigentes de dirección/activos/permiso, incluyendo No controlado; sin filtros generales adicionales por Tipo/Control |
| Importe estrictamente positivo; devolución mediante operación real, no Ingreso artificial | Q2, regla financiera confirmada tras contraste de Álex con v5.11/Criterios |
| Apertura opcional; solo en motor Movimientos, apertura vacía contribuye cero; sin filtro por Fecha apertura | M1/F3/Q3, semántica confirmada del motor, sin convertir null persistente |
| Sin ciclo asignable permitido; bloqueo de fechas económicas futuras según fecha civil de España | Q4, contrato aprobado de app; no atribuir bloqueo a una fórmula Excel |
| Fin temporal distinto de cierre financiero | Confirmado E1.3/P5; fin no bloquea por sí solo |
| Rectificación/anulación auditadas; coincidencias revisables sin unicidad económica | Q5/Q6, procedimientos aprobados para app, no capacidades físicas del Excel supuestas |

### Disponibilidad por dependencia
E1.4 registra Gastos con Partida válida y Categoría que no exige Referencia. Si exige
Referencia, se bloquea el guardado con explicación de dependencia E1.5: no omitir la
obligación, aceptar texto libre, crear REF ficticia ni implementar el maestro antes.
El selector de Referencias queda no disponible; no crear columna provisional libre.
No/vacío histórico en Categoría no activa obligación, sin convertir vacío en false.
Cuando E1.5 esté entregada se comprobarán existencia/Tipo/mapping; E3 añadirá fichas y
restricciones específicas, no excepciones silenciosas en E1.4. No adelantar cuotas
con Partida ligada a Deuda (E1.6), ni su motor o un maestro de Deudas de relleno.

## Data model and contracts
Modelo lógico, NO esquema SQL aprobado ni migración ejecutada.

| Dato | Entrada/persistencia lógica | Derivados/protección |
| --- | --- | --- |
| ID de Movimiento | Numérico estable, único, servidor atómico, sin reutilización | No usar nombre/fecha/posición de fila como identidad; mapping real futuro |
| Fecha económica | Día civil existente, manual, no futura según España | Servidor contrasta con fecha civil Europe/Madrid; metadatos UTC separados |
| Tipo | Ingreso o Gasto, explícito | Rectificación con reglas completas del nuevo Tipo; sin conversión silenciosa |
| Importe EUR | Estrictamente positivo, céntimos enteros y JSON string | Sin float/redondeo; cero/negativos rechazados; agregados exactos sin desbordamiento silencioso |
| Saldo origen/destino | Relación estable por IDs | S000 en lado técnico, no selector; otro lado activo, sin excluir No controlado; Gasto exige permiso |
| Subtipo ingreso | Dominio cerrado R2, obligatorio | No clasificación desde Concepto/Nota; sin Partida en Ingreso |
| Partida | Relación por ID, obligatoria en Gasto | Categoría/Subcategoría/Presupuesto/Deuda por relaciones vigentes, sin copias económicas paralelas |
| Concepto/Nota | Texto libre; propuesta app opcionales, límites técnicos reutilizables | No catálogo de Conceptos ni interpretación automática |
| Referencia | Contrato futuro por ID REF estable, no texto provisional | Sin creación/selector funcional hasta E1.5 |
| Revisión/auditoría | UTC/actor/revisión y operación atómica, motivo de rectificación | Guardar evidencia necesaria del antes/después; sin payloads en logs públicos |
| Anulación | Estado lógico auditable, forma SQL no decidida | Conserva ID/datos y excluye de cómputos; sin DELETE ni compensaciones inexistentes |
| Ciclo, mes financiado y clasificación superior | No entradas paralelas | Derivar por Fecha/IDs; Sin ciclo asignable si no hay intervalo aplicable |
| Saldo actual | Resultado de lectura, no columna acumulada duplicada | Para Control Movimientos: apertura (vacía→0 solo en cálculo) + entradas − salidas vigentes no anuladas |

Un único cálculo centralizado de posición usado en listado/ficha Saldos; no recalcular
con solo filas de la página o con filtros de la consulta de Movimientos. Ningún filtro
por Fecha apertura en Saldo actual, ni siquiera si hay hechos anteriores. Histórico
mensual y sus reglas son otra entrega, no ocultar/borrar hechos por esa fecha.
Efectivo/Inversiones no se presenta como saldo completo al faltar operaciones de
inversión. Terminal/No controlado/Exterior siguen sin posición convencional; Manual
no se habilita. No sumar colchón, patrimonio o indicadores aún no entregados.

### Apertura vacía: semántica limitada al motor Movimientos
Para ese Control, apertura sin informar contribuye cero: sin hechos vigentes el
saldo calculado es 0,00 EUR; con entradas 50 y salidas 20 ficticias, 30,00 EUR.
No se guarda cero sobre null, no se exige completar apertura y se sigue mostrando
«Saldo apertura: Sin informar». Un cero calculado demostrado no es un dato ficticio.
Esta confirmación sustituye la recomendación provisional Q3 de No calculable; no
modifica Valor manual ni las semánticas de Terminal/No controlado/Inversiones.

### Fecha máxima de registro: contrato aprobado para la app
Ingreso/Gasto no pueden tener Fecha económica posterior a la fecha civil actual
de España. Se usa Europe/Madrid como zona de negocio explícita (detalle técnico
para el contrato de fecha español, no offset fijo ni zona del dispositivo).
Servidor obtiene su día civil al validar/confirmar cada escritura; UI comunica ese
límite y no depende de un max enviado por cliente. Pruebas con reloj controlado:
hoy/mañana, cambio de día UTC distinto de Madrid y horario de verano/invierno.
No añadir un mínimo por primer ciclo, Fecha apertura ni reloj. Ciclos futuros siguen
permitidos; esta validación usa el reloj solo como límite de registro, nunca como
Fecha de referencia financiera ni criterio del ciclo actual. Metadatos técnicos UTC.

### Ciclos y referencia financiera: integrar lo ya existente
Imputación por intervalo civil Inicio..Fin inclusivos; último sin Fin admite fechas
posteriores. No usar mes natural como ciclo, selector alternativo, cobro de Nómina
ni último creado como actual. Derivar desde maestro completo antes de filtrar/paginar.
Conectar máximo de fechas económicas de Movimientos al contrato central E1.3:
fuente disponible vacía ≠ pendiente ≠ error; Comida/inversión siguen pendientes.
No usar UTC técnico ni reloj como referencia financiera. Recalcular máximo real tras
rectificar Fecha o anular un registro: puede retroceder, no guardar watermark
monótono. Cabecera/corte/posición leen un estado coherente, sin mezclar revisiones.
E1.3 AC-11 solo recibe cobertura del consumidor Movimientos; no declarar integradas
las otras dos fuentes. AC-23 solo atribución de estos hechos, no todos los módulos.

### Integridad histórica y DT5
Conectar los guards existentes de Saldos/Clasificación a uso real en Movimientos.
No seguir mostrando «impacto financiero no comprobado» para este consumidor si ya
está instalado; sí para planes/indicadores/cierres todavía ausentes.
- Cambios económicos en Saldo usado: impedir edición ordinaria que altere historia;
  no introducir un procedimiento nuevo de rectificación de aperturas por extensión.
- Cambio de jerarquía/métodos/Referencia obligatoria de Categoría/ancestros: vista
  con Movimientos usados, ciclos y efecto comprobable, incluso sin editar ninguna
  fila de Movimientos. Revalidar obligaciones del conjunto afectado antes de confirmar.
  Si el cambio requiere una Referencia no verificable, bloquear; no dejar hechos inválidos.
- Renombrar sin cambio económico mantiene IDs y consultas vivas con nombre vigente.
- Rectificar Movimiento: antes/después de campos, Saldos, Partida/jerarquía, ciclos,
  posición calculable y referencia afectados. Q5 autoriza rectificación y anulación
  conservando siempre el ID, motivo, fecha y valores anteriores/posteriores.
- Mostrar consumidores pendientes sin cifras, indicadores ni cierres simulados.
  No marcar periodos como financieramente abiertos/cerrados por ausencia del módulo.
- Al instalar cierre real, comprobar bloqueo en servidor para todas las escrituras
  directas/indirectas y revalidar dentro de la misma transacción. Fallo de una fuente
  instalada bloquea; fuente futura no es una comprobación de cierre completada.
Revisión técnica, huella de impacto y dependencias actuales revalidadas atómicamente:
si alguien cambia maestro/hechos después de vista previa, 409 sin escritura parcial.
No versionado general de catálogos ni motor de cierre adelantado.

### Rectificación, anulación y advertencia: contratos de app aprobados
Rectificación permite corregir Tipo, Fecha, importe, Saldo ordinario, Subtipo/Partida
y Concepto/Nota con el mismo ID. Al cambiar Tipo, aplicar todos los campos/reglas de
su destino, mostrar antes/después y no inferir una devolución. Registro vigente tras
confirmar es el único contribuyente; las versiones de auditoría no se suman como hechos.
Anular requiere motivo, vista previa y confirmación; conserva identidad, datos, fecha
técnica y antes/después. Excluir del cálculo económico, de máximos de fecha financiera
y de la advertencia de hechos vigentes; mantener histórico consultable y protecciones
sobre relaciones conservadas. Anular no debe exigir sustituir enlaces inactivos ni
fabricar una Referencia que no existía: revalidar operación y protección de impacto,
no tratar la anulación como alta nueva. Sin DELETE ni reactivación en esta entrega.
No sobrescritura de auditoría; reintentos no duplican correcciones/anulaciones.

Coincidencia para advertencia: misma Fecha civil, Tipo, IDs Origen/Destino, importe
exacto y Subtipo (Ingreso) o Partida (Gasto), entre registros vigentes. En rectificación
se excluye el propio ID. Es el criterio de presentación propuesto en Q6, confirmado
como advertencia de app, no una fórmula Excel ni restricción UNIQUE económica.
Concepto/Nota se muestran para ayudar a decidir; no se normalizan para convertirlos
en identidad económica. Mostrar coincidencias y permitir «Registrar otro hecho real»
con confirmación explícita; sin rechazo automático de hechos distintos. Revalidar
bajo transacción; cambios relevantes en coincidencias piden revisión actualizada,
no un veto definitivo. Repetir el mismo intento técnico conserva un solo ID.

## Screens and interfaces
Wireframes APPROVED el 21/10/2026 por el usuario tras revisión de Álex; reutilizar
shell, cabecera central E1.3, componentes,
paleta, tema claro y texto oscuro sobre #8DBB2E. No pantallas implementadas ni capturas.

### Escritorio — consulta
```text
MyFinanzas | Ciclo financiado [contexto real / motivo]
Movimientos                                     [+ Nuevo movimiento]
[Buscar Concepto/Nota/ID] [Tipo] [Ciclo / Todos / Sin ciclo asignable] [Estado] [Más filtros]
Fecha       Tipo/Subtipo       Concepto    Saldo     Partida      Importe   Ver
12/10/2026  Ingreso · Bonus     Ejemplo     S001      No aplica    50,00 €   >
13/10/2026  Gasto               Ejemplo     S001      PARxxx       12,34 €   >
[Página anterior]                                        [Página siguiente]
```
Ejemplos ficticios, importes positivos. Estado: Vigentes por defecto / Anulados / Todos;
anulados identificados, sin computar. Más filtros: intervalo civil, Saldo, Categoría/Subcategoría/Partida;
jerarquía encadenada y por IDs. Todos los ciclos inicialmente, sin inventar filtro
por reloj o limitar la posición general a esta búsqueda. Orden Fecha descendente,
ID como desempate técnico; páginas según patrón existente. Ningún total agregado
parcial presentado como posición general. Tipos futuros identificados no disponibles.

### Móvil — mismas capacidades
```text
[Menú] MyFinanzas | Ciclo [contexto real]
Movimientos                         [+ Nuevo]
[Buscar] [Filtros]
+-------------------------------------+
| 13/10/2026                Gasto      |
| Ejemplo                             |
| S001 · Partida ejemplo              |
| 12,34 €                     [Ficha]  |
+-------------------------------------+
[Página anterior / siguiente]
```
Filtros accesibles desplegables, sin tabla horizontal obligatoria. Diferenciar Tipo,
Subtipo, estado de rectificación/anulación y mensajes, no solo color o signo.

### Alta — página propia
```text
Nuevo movimiento
1. Hecho ejecutado
   Tipo * [Ingreso / Gasto]   Fecha * [hasta hoy en España]   Importe € * [positivo, vacío]
   Concepto [texto libre]    Nota [texto libre]
2. Relación financiera
   Ingreso: Exterior S000 → [Saldo receptor *]
            Subtipo * [Nómina/Bonus/Intereses/Promoción]
   Gasto:   [Saldo origen *] → Exterior S000
            Partida * [selector: Partida · Subcategoría · Categoría]
            Subcategoría/Categoría [derivadas, enlaces de consulta]
            Referencia [No disponible hasta E1.5 / obligación bloqueante]
3. Contexto de comprobación (derivado)
   Ciclo [intervalo/mes financiado / Sin ciclo asignable]
   Posición de Saldo [resultado calculable / motivo], no plan ni previsión
[Cancelar]                                  [Registrar movimiento]
```
Tipo/Subtipo/Partida/Saldo e importe sin selección económica silenciosa; propuesta
fecha inicialmente vacía, reutilizando E1.3. Cambiar Tipo limpia campos incompatibles
con explicación, no convierte automáticamente clasificación o signo. Reconsultar
maestros/permiso/obligación en servidor; selección desactivada mientras se guarda.
No precargar el importe desde Presupuesto ni crear registros por elegir Nómina.
Mostrar ayuda «Importe mayor que cero» y «Fecha máxima: [hoy en España]». Error futuro
conserva borrador; no sustituir la fecha por hoy. Si se advierte coincidencia:
```text
Posible coincidencia — revisa si son hechos distintos
#123 · fecha · Tipo/Subtipo/Partida · Origen→Destino · importe · Concepto
[Volver y revisar]                  [Registrar otro hecho real]
```
La advertencia no reemplaza errores estructurales ni valida Gastos sin Referencia.

### Ficha y rectificación — desktop/móvil
```text
Movimiento #123 · Gasto                  [Volver al listado]
Fecha / Importe / Concepto / Nota
Origen S001 → Exterior S000
Partida PARxxx · Subcategoría SUBxxx · Categoría CATxxx (derivadas)
Ciclo [del maestro] · Revisión [n]
Estado: Vigente / Anulado (motivo y fecha disponibles)
[Rectificar] [Anular] (solo acciones aplicables a vigente)

Rectificar #123
[Tipo/Fecha/Importe/Saldo/Subtipo o Partida/Concepto/Nota]
Motivo obligatorio [................]
[Revisar impacto]
Antes / Después: hecho, Saldos, Partida/ancestros, ciclos, referencia y posición
Cobertura: Movimientos comprobado · otros consumidores pendientes
[Volver al formulario]                   [Confirmar rectificación]
```
Móvil apila pares antes/después y paneles, conservando acciones y motivos. Alta y
rectificación separadas. Confirmación no disponible si obligación financiera incumplida,
cierre protegido cuando exista, error de fuente instalada o revisión obsoleta.
ID inmutable; enlaces inactivos históricos visibles, sin reactivación automática.
Anulación en página de confirmación, sin borrar datos:
```text
Anular movimiento #123
Hecho y relaciones actuales [consulta]
Motivo obligatorio [...........................]
Impacto: dejará de computar · posición/ciclo/referencia afectados [comprobados]
Cobertura de cierres: pendiente de su entrega, no Sin cierres comprobado
[Cancelar]                              [Confirmar anulación]
Resultado: Anulado · ID #123 conservado · motivo/fecha/auditoría disponibles
```
En móvil se apilan los bloques de confirmación; listado/ficha identifican Anulado
con texto. Filtros Vigentes/Anulados/Todos mantienen acceso histórico sin sumar anulados.
La rectificación y la anulación no son devoluciones bancarias reales. Estas deben
representarse con sus operaciones reales cuando su entrega esté habilitada, sin
Ingreso artificial ni importe negativo. No habilitar reactivación de anulados por extensión.

## Empty, loading and error states
Vacío global distinto de sin coincidencias; limpiar filtros y acceso a alta.
Catálogo/fecha/contexto cargando anunciados; fallo nunca se convierte en lista vacía,
importe cero, ausencia de obligaciones o «sin cierre» comprobado. Reintento disponible.
422 con campo/motivo; guardado conserva borrador. 409 conserva intención y pide revisar
impacto/contexto nuevo sin sobrescribir. 401 conserva borrador en memoria con patrón
existente; no tokens/datos económicos en localStorage. 404 permite volver al listado.
Sin Saldos/Partidas elegibles: explicar dependencia y enlazar a catálogo, no semillas.
Referencia obligatoria no disponible: bloqueo explícito, no confirmación de excepción.
Reintento tras respuesta perdida usa misma clave y no duplica el hecho.

## API behavior and external dependencies
Contratos propuestos para desarrollo, sin endpoints ni SQL ejecutados:
GET listado/ficha; POST alta idempotente; vista previa y confirmación de rectificación
con revisión/huella; previsualización/confirmación de anulación con motivo e idempotencia.
Forma final de rutas sigue patrón existente.
Lecturas de Saldos/Clasificación/Ciclos reutilizan servicios vigentes, no endpoints
paralelos de verdad financiera. Validar entradas/derivados y relaciones en servidor.
MFA/sesión, Origin/CSRF, límite JSON, consultas parametrizadas, no-store/errores públicos,
transacciones IMMEDIATE y auditoría existentes. Reintento/contexto/revisión protegen
alta/corrección ante dos pestañas/procesos, sin nuevos frameworks/dependencias.
Sin DELETE de hechos ni endpoint para alterar fecha de referencia manualmente.

Continuidad: futura extensión versionada desde SQLite v3 sin borrar/resembrar/resetear
Saldos, Clasificación, Ciclos, autenticación/MFA, sesiones, auditoría, counters o intentos.
Rechazar desconocidos, rollback DDL, apertura concurrente; backup previo age y restauración
aislada compatibles. No fijar ahora tablas/DDL/versiones nuevas. Guardar identidad de origen
para migración real posterior, no importar datos ni inventar mapping del Excel físico.

## Validation and edge cases
Los errores estructurales bloquean; conciliación y avisos no son automáticamente errores.
ID estable, no reutilización, referencias por IDs existentes; no Partida de otra jerarquía
aportada por cliente ni Categoría almacenada como fuente independiente. Permiso de salida
false bloquea Gasto; null histórico no se interpreta como true ni como false almacenado:
pedir resolución explícita antes de admitir una salida no demostrada. No excluir No controlado
ni usar Tipo/Control/ausencia de motor como restricciones generales adicionales.
No deducir permiso de Finalidad/Liquidez/bolsa/Control. Campo monetario omitido no es cero.
Céntimos exactos, importe >0 y fechas civiles válidas ≤ fecha civil actual de España;
sin instantes UTC para imputar ciclos. Sin ciclo asignable no impide registrar hechos.
Apertura ausente equivale a cero solo en motor Movimientos, sin mutar el dato original.
Un cambio de datos entre selección, vista previa y commit revalida todas las condiciones.
No impedir Gasto por no tener Presupuesto; no registrar cuotas de deuda como Gasto genérico
saltándose E1.6. No habilitar inversiones como tipos de Movimiento obsoletos.

## Exclusions
Dev 04, código, SQL/DDL/migraciones ejecutadas, importación/datos reales/Excel,
merge/despliegue/servicios, Transferencias/Referencias operativas E1.5, cuotas/Amortización
E1.6, inversión, Nómina planificada, presupuestos/ejecución mensual, Comida auxiliar,
cierre/reapertura/fotografías e histórico mensual completo. No habilitar Manual operativo,
versionado general de catálogos, simulación de proveedores ni cálculos patrimoniales.

## Acceptance checks
**Previstos, no ejecutados.** I = implementable en E1.4 cuando se autorice dev 04;
C = contrato futuro. **29 I / 4 C**; IDs AC-01–33 conservados. Q1–Q6 resueltas,
sin criterios financieros condicionados a otra ronda. Documento y wireframes aprobados; pruebas de implementación pendientes.

| ID | Acción/precondiciones | Resultado observable esperado y prueba prevista | Estado |
| --- | --- | --- | --- |
| AC-01 | Crear los cuatro subtipos de Ingreso | S000→receptor, Subtipo obligatorio, sin Partida; API/SQLite | I |
| AC-02 | Crear Gasto con Partida sin Presupuesto | Salida a S000, permitido sin Presupuesto, clasificación desde IDs; API/UI | I |
| AC-03 | Saldo con permiso No/ausente y manipular payload | No omite comprobación de salida; motivo, sin inferir ni convertir atributo histórico; API | I |
| AC-04 | Probar cada par Tipo/Control como receptor/origen | Reglas Origen/Destino, activos y permiso; No controlado admitido, sin filtro general extra por Tipo/Control; API/UI | I |
| AC-05 | Importe vacío/null/float/tercer decimal/exceso técnico | Rechazo exacto, sin default cero ni redondeo; Bun | I |
| AC-06 | Probar signo/cero y devolución | Rechaza 0/negativos; permite céntimo positivo, no Ingreso artificial ni importe absoluto automático para devolución; Bun/API | I |
| AC-07 | Categoría exige Referencia y maestro aún no disponible | Bloquea Gasto y explica dependencia, sin texto/REF de relleno; API/UI | I |
| AC-08 | Derivados de clasificación aportados por cliente o Ingreso con Partida | Rechaza fuente paralela, ausencia de jerarquía válida bloquea; API | I |
| AC-09 | Consultar posición Movimientos con apertura 100, Ingreso 50 y Gasto 20 ficticios | 130 EUR exactos; sin escribir posición acumulada; Bun/API | I |
| AC-10 | Hecho anterior a Fecha apertura; filtrar/paginar su consulta | Cuenta en Saldo actual, independiente de filtros; histórico mensual no implementado; Bun | I |
| AC-11 | Apertura ausente, con y sin hechos | Solo Control Movimientos: sin hechos 0,00 EUR; con Ingreso 50/Gasto 20, 30,00 EUR; null persiste y no cambia otros controles; Bun/API | I |
| AC-12 | Consultar otros controles tras registrar hechos | No presenta posición incompleta de inversiones/Terminal/Exterior/No controlado como completa ni habilita Manual; Bun/UI | I |
| AC-13 | Hechos exactamente en Inicio/Fin y fuera del mes natural financiado | Ciclo correcto por intervalo, maestro completo; Bun/API | I |
| AC-14 | Maestro vacío/hecho anterior al primer Inicio/fecha futura | Guarda sin ciclo como Sin ciclo asignable; hoy español válido, mañana bloqueado en UI/servidor; medianoche UTC/Madrid y DST; Ciclos futuros siguen válidos; Bun/API/UI | I |
| AC-15 | Registrar hechos, comparar máximas fechas y consulta sin hechos | Fuente Movimientos disponible con máximo o vacía; otras dos pendientes, cabecera por referencia; Bun/UI | I |
| AC-16 | Rectificar/anular el hecho de fecha máxima | Excluye anulados y recalcula máximo/actual/corte desde hechos vigentes, incluso retroceso o referencia null al anular el último; Bun/API/UI | I |
| AC-17 | Cambiar Concepto/Nota y renombrar maestro sin cambio económico | Texto/nombre no cambia Tipo/IDs/clasificación ni genera catálogos; API/UI | I |
| AC-18 | Seleccionar maestros inactivos frente a consultar histórico | No nuevas selecciones inactivas; enlaces históricos preservados, sin reactivar al consultar; API/UI | I |
| AC-19 | Rectificar campos permitidos con motivo/vista previa | Mismo ID, motivo/fecha/antes/después, reglas del Tipo y relaciones revalidadas; posición/ciclo/referencia coherentes, sin cambio silencioso; Bun/API/UI | I |
| AC-20 | Anular un movimiento registrado por error que no representa un hecho económico real | Vista previa/confirmación/motivo, mismo ID y auditoría; no contribuye a posiciones/referencia, consultable como Anulado, reintento no duplica; sin DELETE ni falsa devolución; Bun/E2E | I |
| AC-21 | Cambiar Saldo usado o jerarquía/Referencia obligatoria de ancestro usado | Guard de uso real activo; bloqueo ordinario o rectificación con movimientos/ciclos afectados y revalidación, no solo catálogo; Bun/API | I |
| AC-22 | Cambiar maestro/hechos después de vista previa, fallo de auditoría | 409/rollback íntegro, sin mitad de efectos; concurrencia dos clientes/procesos | I |
| AC-23 | Doble envío/reintento tras respuesta perdida | Una sola alta, ID numérico único/estable/no reutilizado, lectura tras reinicio; Bun/E2E | I |
| AC-24 | Dos hechos genuinos idénticos o copia accidental | Advierte coincidencia por firma documentada; permite confirmar hecho distinto con otro ID, sin unicidad de contenido; reintento conserva un solo ID; Bun/E2E | I |
| AC-25 | Acceso sin MFA, mutar sin Origin/CSRF y enviar derivados/tipos futuros | Rechazo con protección existente, sin exponer datos/factores/SQL; API | I |
| AC-26 | Listado/ficha/alta/rectificación a 390/1440 y teclado | Wireframes revisados, tabla/tarjetas, foco y mensajes, capturas reales solo tras dev | I |
| AC-27 | Vacío/carga/error/404/422/409/401/reintento | Estados distintos, borrador conservado y sin ceros financieros ficticios; E2E | I |
| AC-28 | Upgrade desde base E1.3 genuina existente, error y dos aperturas | Datos completos/acceso/ciclos preservados, atomicidad, desconocido intacto, sin resemilla; Bun | I |
| AC-29 | Copia age y restauración aislada del nuevo estado | Hechos/posiciones/referencia coherentes, MFA tras política de restore, sin servicio externo; Bun/E2E | I |
| AC-30 | Integrar Referencias y tipos/fichas en E1.5/E3 | Existencia/Tipo/mapping y restricciones reales, sin bypass de obligación | C |
| AC-31 | Entregar Transferencias/Deuda/inversión | Efectos integrados en sus motores, no falsamente cubiertos por Ingreso/Gasto | C |
| AC-32 | Instalar cierres y fuentes DT5 | Bloqueo real transversal y fotografías inmutables, fallo atómico; no probado con módulos ausentes | C |
| AC-33 | Entregar histórico mensual/planificación/Comida | Reglas de Fecha apertura, ejecución y conciliación correspondientes, sin adelanto en E1.4 | C |

## Revisión y siguiente acción
Q1–Q6 confirmadas y trazadas en brainstorming; especificación completa y wireframes
aprobados expresamente el 21/10/2026 tras revisión favorable de Álex. Spec 04 cerrada;
ajuste aclaratorio AC-20 solicitado por usuario incorporado sin cambio de regla.
Integrar PR #14 mediante squash tras ambas CI verdes del commit definitivo. Después
esperar autorización expresa de dev 04; no iniciar implementación por extensión.
No pruebas de funcionalidad ejecutadas en esta fase: controles son documentales.
