# 07 — E2.1 Operación de Ciclos y apertura revisable: Specification
Status: APPROVED — especificación y wireframes aprobados e integrados en main (PR #37, c04dc07). Desarrollo dev07 fuera de main, sin PR; aceptación E2.1 bloqueada por AC23.
Approval source/date: usuario «dale» en respuesta al cierre de ejecución que presentó PR34 y spec07/wireframes para aprobación, 2026-10-22. Q1/Q2 confirmadas previamente.
Context and brainstorming: [ronda y respuestas](07-ciclos-operacion-brainstorming.md),
[roadmap E2.1](roadmap.md#e21--operación-de-ciclos-y-apertura-revisable),
[contrato E1.3](03-ciclos-financiados-specification.md), [referencia R3/R4/P5](functional-reference-v5.11.md).

Referencia financiera única v5.11(7), candidata NO estable; fuentes sanitizadas,
sin libro físico ni datos reales inspeccionados por Codex. Documento 07 libre al
asignarlo. Preparación desde main 7c5c7d1b; al autorizar un futuro dev se reconciliarán
main, E1.6 y la versión real del esquema sin sustituir fixtures ni trabajo ajeno.
La autorización actual permite el cierre documental aprobado de E2.1. La aprobación
procede del usuario, no de completar/publicar el documento. No autoriza desarrollo,
código/DDL, migraciones ni integración automática de una nueva PR.

## Functionality
Ampliar el único maestro Ciclos para registrar un periodo omitido y rectificar
Inicio/saldo inicial comida, con revisión explícita y consecuencias verificables.
Conservar alta ordinaria posterior y consulta E1.3, sin crear un ciclo desde Nómina,
sin cerrar financieramente y sin tocar hechos ni aperturas del ciclo siguiente.

### Decisiones y dependencias reutilizadas
- E1.3/E1.4 integradas son las dependencias duras directas. E1.6 no bloquea esta
  especificación: sus hechos, cuando estén integrados, usan el mismo maestro.
  No se inicia ni espera Dev32 como requisito artificial.
- Entradas financieras manuales únicas: Inicio y saldo inicial comida. Identidad,
  revisiones, motivo e intento son metadatos de operación, no nuevas entradas de cálculo.
- Mes financiado = primer día del mes siguiente a Inicio, único por mes/año completo.
  Inicio obligatorio/único; Fin = siguiente Inicio cronológico menos un día civil.
  Último sin siguiente permanece Abierto sin Fin; ese estado no es cierre financiero.
- Saldo comida siempre explícito: cero y negativos válidos, sin default ni copia del
  cierre previo. No se genera reposición, Gasto, ingreso o asiento de apertura.
- Referencia máxima desde hechos vigentes reales disponibles; intervalo inclusivo,
  sin reloj ni Nómina como sustitutos. Q1–Q3 de E1.3 no se reabren.
- Usuario Q1 confirma rectificación con hechos afectados por el procedimiento de esta
  propuesta. Usuario Q2 confirma operación disponible con E2.1-AC2 pendiente hasta
  Comida. No implica aprobación final de esta spec o de su UX.

### Alta ordinaria y ciclo omitido
El alta ordinaria conserva Inicio posterior al último, dos campos explícitos y la
vista previa E1.3. Puede prepararse antes del cobro e Inicio puede ser futuro.
La acción diferenciada «Registrar ciclo omitido» permite añadir antes del primero o
entre Inicios existentes, con las mismas dos entradas financieras, motivo obligatorio,
revisión de impacto y confirmación. Una inserción no se presenta como alta ordinaria
para eludir su contrato de solo posteriores. Nueva identidad estable del servidor;
no renumerar los ciclos ni importar identidades inventadas del Excel.

La revisión deriva el mes financiado y los intervalos del maestro completo. Incluye
el ciclo nuevo, el anterior cuyo Fin cambia y cada hecho vigente o anulado cuya
atribución consultada cambia, incluso de «Sin ciclo asignable» al nuevo ciclo.
No exige inventar un ciclo para rellenar cada mes: los huecos cronológicos siguen
el maestro existente y ninguna regla nueva impone continuidad mensual artificial.
El mes financiado duplicado sigue rechazado aunque los Inicios sean distintos.

### Rectificación con revisión de impacto — Q1 confirmada
Desde la ficha se corrigen Inicio y/o saldo inicial comida; ID permanece estable.
Inicio corregido respeta orden estricto entre los Inicios vecinos del ciclo actual;
no se puede saltar sobre un vecino para reordenar IDs. En el primer/último ciclo se
valida el vecino existente. No DELETE, fusión, reasignación de ID ni mes financiado
manual. Nombre de ciclo sigue derivado, no se introduce otro catálogo.

Antes de guardar se exige motivo no vacío y vista previa con:
- Valores manuales anteriores/propuestos, mes financiado e intervalos antes/después.
- Ciclo rectificado y vecinos cuyo Fin/intervalo o estado temporal cambian.
- IDs, fechas, Tipo, vigencia y ciclo antes/después de los hechos afectados, con
  detalle paginado si hace falta; el cálculo usa todos los hechos/maestro.
- Referencia financiera y ciclo actual antes/después según las fuentes reales.
- Cobertura por consumidor: Movimientos comprobado; no entregados identificados;
  error de un consumidor instalado distingue fallo de impacto cero.

Confirmar relee maestro, hechos y consumidores disponibles dentro de la transacción.
Si cambia el contexto entre revisión y confirmación, responder conflicto y exigir
revisión nueva; conservar borrador/motivo. No recalcular silenciosamente y guardar
un impacto distinto del aceptado. Reintentar una respuesta perdida no repite la
rectificación, su auditoría o la reserva de identidad.

La nueva atribución se deriva de fechas originales y maestro corregido; no editar
importe, fecha, clasificación, Deuda, Referencia ni ID de Movimientos. No guardar
un Ciclo paralelo en cada hecho. Cambiar de periodo no cambia posición bancaria,
capital Deuda, gasto global ni máximo de fechas económicas; sí puede cambiar el
periodo consultado y la cabecera que contiene esa misma referencia.

Cambiar saldo inicial comida solo modifica esa entrada explícita del ciclo. No
propaga un saldo al siguiente, no cambia hechos bancarios ni interpreta diferencia
como reposición real. Inicio/apertura revisados y su motivo se auditan con antes/
después; la auditoría de la corrección no equivale a una fotografía financiera.

### Cobertura de Comida y futuro plan — Q2 confirmada
Hoy no hay motor Revisión Comida ni cierre bancario de comida verificable. Se muestra
«Conciliación comida: No disponible · Revisión Comida pendiente», sin «Conciliado»,
cero calculado, cierre manual sustitutorio ni comparación ficticia. Se puede confirmar
la apertura manual y rectificarla; la ausencia de ese motor no impide la operación
que el usuario autorizó especificar.

**E2.1-AC2 del roadmap sigue PENDING** hasta integrar E3.5 con datos reales del módulo
en fixtures: diferencia entre cierre previo verificable y apertura manual genera
aviso/conciliación, nunca autorrelleno ni modificación automática del siguiente ciclo.
No se altera el criterio ni se da por PASS con un contrato aislado. El testplan de la
implementación futura distinguirá «operación disponible verificada» de «integración
Comida pendiente»; no declarará E2.1 íntegramente verificada por sus pantallas.

Comida/inversión se incorporarán al mismo contrato central de fuentes cuando existan.
Un proveedor instalado que falla bloquea confirmar una revisión cuyo impacto debería
comprobar; no omitirlo silenciosamente. Un proveedor aún no entregado se identifica
pendiente y no simula hechos. La integración real se revalidará en E3/E4.

No hay precarga de plan en E2.1. DT3 sobre el siguiente plan queda para E2.3 junto a
su plan operativo: esta spec no elige copia, importes ni versión de un plan inexistente.

### Límites de cierre
No se implementan cierre/reapertura ni fotos. Fin temporal derivado no activa ninguna
protección de cierre ficticia. Cuando E4 instale cierre y guardas transversales, se
integrarán en la revisión de Ciclos y bloquearán/revalidarán según su spec aprobada;
Q1 no autoriza saltar futuros cierres ni rectificar por defecto cierres antiguos.

## Data model and contracts
Modelo lógico propuesto; DDL, versión siguiente y rutas precisas son detalles del
futuro desarrollo autorizado, después de reconciliar el esquema instalado.

| Dato | Contrato |
| --- | --- |
| ID Ciclo | Existente preservado; nuevo servidor atómico/no reutilizado, sin significado económico |
| Inicio/saldo comida | Únicas entradas financieras; fecha civil ISO e importe EUR exacto explícito |
| Mes/Fin/estado/corte/actual | Derivados desde maestro y hechos completos; no otra fuente persistida |
| Revisión/intento | Control de concurrencia e idempotencia siguiendo patrones existentes |
| Motivo/auditoría | Actor único, UTC y antes/después de la operación, inmutables y consultables |
| Detalle de impacto | Verificable por IDs/fechas/periodos; no suma heterogénea presentada como Gasto |
| Estado de conciliación | Cobertura real/motivo; no saldo de cierre ficticio ni flag «conciliado» manual |

La auditoría registra el cambio y conserva historia; no crea snapshots de motores,
planes o cierres inexistentes. No versionado general de todos los catálogos.
Precisión EUR en céntimos enteros/strings JSON y agregación exacta conforme al stack;
no floats ni redondeo silencioso. Ausencias históricas no se normalizan como cero.
Fechas económicas civiles sin horas; UTC solo metadatos de auditoría.

Continuidad SQLite: actualización versionada bajo transacción IMMEDIATE preservando
Ciclos/IDs/Movimientos/REF/Deudas/acceso/MFA/contadores/intentos/origen y pareja DB/clave.
No borrar/resembrar ni recrear la base; si se sustituyen triggers de solo append/no
UPDATE, mantener identidad/no DELETE y validaciones del procedimiento nuevo.
Rollback de DDL/datos/versión, arranques concurrentes y versión desconocida intacta.
Fixtures genuinas del esquema anterior, incluidas identidades demo/production
ficticias; nunca renumerar un esquema nuevo para fingir upgrade. Sin operación real.

## Screens and interfaces
**Wireframes aprobados documentalmente**, no capturas ni UI implementadas. Identidad
clara MyFinanzas y componentes existentes, sin rediseño ni librerías nuevas.
Conservar listado tabla/tarjetas, filtros, ficha y alta E1.3. Añadir acción de ciclo
omitido y rectificación con revisión de impacto, sin acciones de cierre.

### 1440 px — listado/ficha
```text
MyFinanzas | Ciclo financiado [intervalo referencia] · referencia [fecha/motivo]
Ciclos financiados           [Registrar ciclo omitido] [+ Nuevo ciclo]
[Buscar mes/Inicio] [Todos / Abierto / Con fin temporal]
Mes financiado   Inicio       Fin          Estado temporal    [Ver ficha]
[mes/año]        [fecha]      [fecha/—]     [estado]

Ciclo · [mes financiado]                              [Volver]
ID [estable] · Inicio [fecha] · Fin [fecha / Sin siguiente Inicio]
Saldo inicial comida [importe manual]
Conciliación comida: No disponible · Revisión Comida pendiente
Cierre financiero: Funcionalidad no disponible
[Rectificar ciclo]                  [Consultar historial de rectificaciones]
```

### 1440 px — formulario y revisión
```text
Rectificar ciclo [ID] / Registrar ciclo omitido
Inicio * [fecha]                Saldo inicial comida * [importe]
Motivo * [_____________________________________________________]
Mes financiado [derivado] · no crea nómina ni cierre
[Cancelar]                                      [Revisar impacto]

Revisar rectificación
                         Antes                  Después
Inicio / mes financiado  [fecha / mes]          [fecha / mes]
Intervalo ciclo          [Inicio—Fin]           [Inicio—Fin]
Intervalo vecino         [Inicio—Fin]           [Inicio—Fin]
Saldo inicial comida     [importe]              [importe]
Referencia / actual      [fecha / ciclo]        [fecha / ciclo]
Hechos afectados [cantidad · Ver detalle]
ID   Fecha   Tipo   Vigencia   Ciclo antes   Ciclo después
[id] [fecha] [tipo] [estado]   [ciclo/ninguno] [ciclo/ninguno]
Cobertura: Movimientos comprobado; Comida/inversión pendientes
No se alteran las fechas ni importes originales de los hechos.
[Volver al borrador]                      [Confirmar rectificación]
```
En alta omitida la etiqueta final es «Confirmar ciclo omitido». Mostrar «No existía»
para el ciclo nuevo, sin importes/fechas cero ficticios. Los hechos anulados son
historia consultable y se distinguen de vigentes; no computan importes económicos.
No sumar los cuatro Tipos bajo una etiqueta económica única.

### 390 px — ficha y revisión
```text
[Menú] MyFinanzas
Ciclo [mes/año · ID]
Inicio [fecha] · Fin [fecha / Sin siguiente Inicio]
Saldo inicial comida [manual]
Conciliación: No disponible · Comida pendiente
[Rectificar ciclo] [Historial]

Revisar rectificación
Antes:   [Inicio—Fin]
Después: [Inicio—Fin]
Vecino afectado: [antes → después]
Saldo comida: [antes → después]
Hechos: [cantidad · Ver detalle en tarjetas]
Referencia / actual: [antes → después]
Fuentes pendientes: Comida / inversión
[Volver] [Confirmar rectificación]
```
Formulario apilado y detalle en tarjetas, teclado/labels/foco visible. Ningún paso
depende solo de color; sin scroll horizontal obligatorio. Historial muestra motivo,
instante, actor y valores anteriores/posteriores, sin llamarlo foto de cierre.
La navegación de vuelta conserva borrador/motivo en memoria, sin datos financieros
en URL o localStorage. Capturas e inspección reales solo en un dev autorizado.

## Empty, loading and error states
Maestro vacío distinto de búsqueda sin resultados; alta ordinaria disponible sin
Nómina. Sin hechos afectados mostrar impacto cero solo tras lectura correcta.
Sin referencia: motivos E1.3, no fecha falsa. Fuente instalada fallida: error con
reintento, sin impacto incompleto presentado como válido. Conciliación Comida pendiente
se distingue de discrepancia real, que no puede comprobarse aún.
409 por revisión/contexto nuevo conserva el borrador/motivo y exige revisar otra vez;
422 muestra campo/causa y mantiene valores. Duplicado conserva Inicio y explica
mes financiado ya existente. 404 ofrece vuelta al listado, sin ficha demo sustituta.
401/sesión caducada usa MFA existente; nunca bypass ni persistencia de credenciales.
Red fallida conserva el intento: reintento técnico no duplica alta ni auditoría.
Carga/éxito/error se anuncian y foco pasa a revisión, confirmación o error accesible.

## API behavior and external dependencies
React → Effect HTTP → SQLite directo; no nuevas dependencias ni servicios.
Reutilizar lectura/listado/contexto e incorporar operaciones servidor de impacto,
inserción omitida y rectificación/historial. Nombres precisos de rutas quedan al dev;
no API alternativa que permita editar Inicio/saldo saltándose revisión o auditoría.
Campos derivados/ID manipulados rechazados. MFA obligatorio en lectura/escritura;
Origin/CSRF, límite JSON, no-store y errores genéricos con requestId existentes.

Confirmar bajo IMMEDIATE: relectura/revalidación, reserva de identidad si alta,
mutación, auditoría e intento atómicos. Fallo revierte todo. Huella de revisión incluye
las entradas reales relevantes de maestro/hechos/consumidores disponibles; no sustituye
autenticación ni se presenta como firma financiera. Detalle paginado no reduce el
conjunto usado para calcular impacto. Orden estable por fechas/IDs sin inventar horas
ni usar ID como precedencia económica de hechos del mismo día.

400/422 para estructura/validación, 401/403 acceso/Origin/CSRF, 404 entidad inexistente,
409 revisión/contexto/duplicado/orden incompatible, 500 genérico; seguir patrones del
producto al concretar códigos. No SQL, payloads, factores o importes en logs públicos.
Copia age/manifiesto con versión correcta y restore a destino nuevo/MFA; no activar
scheduler, backup externo ni cambiar política de custodia/recuperación.

## Validation and edge cases
- Fechas civiles reales, bisiestos, cambio de ejercicio y DST sin desplazamientos.
  Unicidad mes/año completo; no distancia mínima ni veto por reloj/cobro.
- Rectificar dentro de vecinos; insertar antes del primero o entre vecinos permite
  recuperar atribución antes sin ciclo. No saltar/renumerar vecinos ni borrar ciclos.
- Inicio anterior/posterior a referencia mantiene reglas de actual/corte E1.3;
  cambiar maestro no adelanta ni retrocede máximo de hechos originales.
- Saldo comida obligatorio, cero/negativo exactos, ausencia inválida al alta; no copiar
  cierres ni siguiente apertura. Motivo no vacío en operaciones de revisión nuevas.
- Revalidar doble pestaña/proceso y respuestas perdidas; no consumir ID/auditoría/intento
  si la revisión queda obsoleta o una escritura falla.
- No declarar comprobados consumidores pendientes. Al existir Comida/inversión/cierre,
  integrar sus lecturas/guardas y revalidar el mismo contrato en su entrega.

## Exclusions
No desarrollo E2.1, código/SQL/migración ejecutados en esta fase. En su futuro dev:
sin Nómina, Presupuestos, plan/copias/precarga E2.3, motor Revisión Comida E3.5,
inversión, cierre/reapertura/fotos E4, borrado/fusión de ciclos, reordenación arbitraria,
importación/Excel/datos reales, VPS, despliegue, Dev32 ni cambios de seguridad.
La aprobación futura de spec no autoriza desarrollo ni merge por sí sola.

## Acceptance checks
Pruebas **PREVISTAS, NO ejecutadas**. 26 criterios I de operación disponible y 3
contratos C de integración futura. La reserva AC-27 conserva E2.1-AC2 del roadmap
pendiente conforme Q2; no se elimina, rebaja ni contabiliza como verificado.
E2.1-AC1 se traza a AC-01/15; E2.1-AC3 a AC-13/14/16 y AC-28 al incorporar fuentes.
La entrega operativa y el cierre completo de sus integraciones se reportan separados.

| ID | Acción / precondiciones | Resultado observable esperado | Verificación prevista |
| --- | --- | --- | --- |
| AC-01 I | Crear siguiente ciclo antes del cobro con saldo explícito | Fin anterior derivado; no ingreso/Nómina/cierre ni saldo copiado | API/UI |
| AC-02 I | Registrar ciclo omitido antes del primero o entre Inicios | Nuevo ID estable; vecinos/mes/intervalos derivados y revisados, sin renumerar | API/UI |
| AC-03 I | Omitir motivo en alta omitida o rectificación | Rechazo sin escritura; alta ordinaria existente conserva su contrato | API/UI |
| AC-04 I | Insertar Inicio/mes duplicado o fecha inválida | Rechazo con causa; borrador conservado, sin consumir identidad | Bun/API/UI |
| AC-05 I | Rectificar Inicio sin saltar vecinos | Mismo ID, mes/intervalos y vecinos correctos; no cambios de hechos originales | Bun/API/UI |
| AC-06 I | Rectificar Inicio saltando vecino o duplicando mes | Rechazo atómico, maestro previo intacto | Bun/API |
| AC-07 I | Revisar caso con hechos que cambian de ciclo o desde Sin ciclo | IDs/fechas/tipos/vigencia y periodos antes/después completos; no total heterogéneo de Gasto | Bun/API/UI |
| AC-08 I | Filtrar/paginar maestro y hechos afectados | Derivación/huella usa conjuntos completos; detalle estable sin omisiones | Bun/API |
| AC-09 I | Confirmar rectificación revisada con hechos utilizados | Atribución consultada coincide con revisión; fechas/importes/IDs/auditorías originales intactos | Bun/API/E2E |
| AC-10 I | Cambiar saldo comida a cero/negativo y dejarlo ausente | Acepta explícitos exactos; rechaza ausencia inválida sin convertirla a cero | Bun/API/UI |
| AC-11 I | Corregir apertura de ciclo con siguiente ya creado | Solo entrada elegida cambia; siguiente apertura y hechos bancarios intactos | Bun/API/UI |
| AC-12 I | Consultar conciliación antes de existir Comida | No disponible/motivo; sin cierre ficticio, sin «Conciliado» o comparación cero | API/UI |
| AC-13 I | Referencia vacía/error/anterior al primero y abierto futuro | Mismos motivos/actual/corte E1.3; ningún fallback a reloj/Inicio/Nómina | Bun/API/UI |
| AC-14 I | Hechos en Inicio−1/Inicio/Fin/siguiente Inicio y cambio de ejercicio | Intervalos inclusivos desde maestro; bisiesto/DST civiles correctos | Bun/API |
| AC-15 I | Insertar siguiente o rectificar periodo | Sin cierre financiero ni fotos; etiquetas distinguen fin temporal | API/UI |
| AC-16 I | Cambiar Inicio con referencia Movimientos existente | Actual puede cambiar; referencia máxima y posiciones/importe global no cambian | Bun/API/E2E |
| AC-17 I | Cambiar hecho/maestro después de preview | 409 y nueva revisión; borrador/motivo conservados sin efecto parcial | Bun procesos/API/UI |
| AC-18 I | Dos procesos insertan o rectifican mismo contexto | Un resultado coherente; otro conflicto; no IDs ni meses duplicados | Bun procesos |
| AC-19 I | Reintentar respuesta perdida o reutilizar intento con otro payload | Una sola operación/auditoría; payload distinto conflictúa | Bun/API/E2E |
| AC-20 I | Fallar auditoría/intento durante operación | Rollback de maestro/revisión/ID/auditoría/intento y posiciones intactas | Bun fault injection |
| AC-21 I | Consultar historial de rectificación y manipular ID/derivados/DELETE | Motivo/actor/UTC/antes/después verificables; rechaza manipulación/borrado | API/UI |
| AC-22 I | Rutas sin MFA o sin Origin/CSRF y error técnico | Rechazo servidor y errores genéricos; sin datos/SQL/factores públicos | Bun Effect HTTP |
| AC-23 I | Upgrade genuino previo con historia/MFA demo y producción ficticias; fallo DDL/dos arranques/desconocido | Preservación DB/clave/origen/IDs/datos/acceso; rollback y rechazo intacto | Bun integración/procesos |
| AC-24 I | Backup age/manifiesto del nuevo esquema y restore aislado | Maestro/historial/atribución recuperables, versión correcta y política MFA/revocación preservada | Bun + E2E |
| AC-25 I | Listado/ficha/alta omitida/rectificar/revisión/historial 390/1440 | Tabla/tarjetas, teclado/foco/contraste y sin overflow; capturas reales inspeccionadas solo en dev | Playwright/inspección |
| AC-26 I | Forzar vacío/carga/error/401/404/409/422 y regresar al borrador | Estados reales distinguibles; sin datos sustitutos ni pérdida de intención | API/E2E |
| AC-27 C | Integrar cierre Comida real en E3.5 y apertura distinta | Aviso/conciliación verificable, sin autorrelleno ni cambiar siguiente saldo; E2.1-AC2 sigue pendiente hasta esa prueba | Futuro E3.5 |
| AC-28 C | Instalar Comida/inversión como fuentes temporales reales | Máximo/periodos/corte y cobertura comunes; fallo instalado no se omite | Futuras E3/E4 |
| AC-29 C | Instalar cierre/protecciones de E4 | Revisión de Ciclos respeta guardas transversales y fotos según contrato aprobado; sin excepción antigua implícita | Futuras DT5/P5/E4 |

## Reanudación y aprobación
Q1/Q2 respondidas expresamente el 2026-10-22; no pedirlas otra vez. Especificación
completa y wireframes aprobados por el usuario «dale» tras el cierre de la ejecución
coordinada. E1.6 integrada por PR34 en cb9ba3b; worktree documental sincronizado sin
perder borradores. Preparar PR documental para revisión y permiso de merge de esa PR.
Desarrollo requiere autorización expresa independiente de E2.1. No hay pruebas
funcionales/UI ejecutadas en esta fase ni se declara E2.1-AC2 verificado antes de Comida.
