# 20 — E4.5 Histórico precontrol y transición de ejercicio: Specification

Status: **PROPUESTA DOCUMENTAL — NO APROBADA.** Q1–Q10 del
[brainstorming](20-historico-precontrol-brainstorming.md) siguen abiertas y DT7 no está
aprobado. La especificación, los wireframes y los AC son un candidato para revisión de
Codex y **aprobación exclusiva del usuario**; no autorizan desarrollo, SQL, migración,
importación real, Excel, datos personales, PR, merge ni despliegue.

Approval source/date: **PENDIENTE.** No existe aprobación humana de esta especificación
ni de sus wireframes. La autorización recibida el 2026-10-27 solo permite preparar
documentación y QA documental con datos ficticios.

Context and brainstorming: [20-historico-precontrol-brainstorming.md](20-historico-precontrol-brainstorming.md),
[E4.5](roadmap.md#e45--histórico-precontrol-y-transición-de-ejercicio),
[P6/DT7](roadmap.md#decisiones-abiertas-y-puntos-de-autorización),
[R1–R6/P6](functional-reference-v5.11.md), [E1.1](01-saldos-control-specification.md),
[E1.2](02-clasificacion-specification.md), [E1.4](04-movimientos-specification.md),
[E1.5](05-transferencias-referencias-specification.md), [E1.6](06-deuda-specification.md),
[E2.4](10-plan-anual-specification.md), [E4.4](17-e44-deuda-completa-specification.md),
[E4.7/E4.11/E4.12](roadmap.md).
Guías: [arquitectura](guidelines/architecture.md), [seguridad](guidelines/security.md),
[calidad](guidelines/quality.md) y [UI](guidelines/ui.md).

Base de preparación: `origin/main` = `1d539a8cb9c38b3a8d2e3921a3651197105ce282`
(2026-10-27), esquema SQLite v16; base inicial `26b6f0c`, refrescada durante la preparación a `2487656` y después a `1d539a8`. Esta spec no fija una versión futura de esquema ni escribe SQL. El desarrollo deberá comprobar de nuevo `main`, la versión vigente y los
contratos integrados antes de implementar.

## Functionality

E4.5 permite **consultar un archivo histórico precontrol separado de los hechos
detallados** y conocer su cobertura, procedencia, mapping y límites. El archivo no es
un segundo ledger, no es una fotografía de cierre y no es un plan: es una fuente
histórica de solo lectura que puede combinarse con Gastos detallados únicamente cuando
la procedencia, el mapping y los intervalos permiten demostrar que no hay duplicado.

Capacidades incluidas:

1. Consultar por ejercicio natural los registros de archivo y su cobertura.
2. Identificar cada registro por un ID interno estable y conservar su ID/origen
   original, huella y procedencia.
3. Enlazar Partidas y Referencias por ID mediante un mapping versionado y auditable.
4. Combinar archivo y Gastos detallados sin doble cómputo, con corte inclusivo y
   cobertura explícita; si no se puede demostrar, no presentar un total verificado.
5. Conservar aperturas e importes originales sin convertirlos en Movimientos, Saldos,
   Deudas, planes o fotos nuevas.
6. Mostrar la transición entre ejercicios sin arrastrar archivo, plan, aperturas,
   hechos ni fotos ausentes.
7. Tratar la regularización válida de 2026 como una excepción explícita, acotada y
   no generalizable.
8. Distinguir ausencia, cero explícito, dato no verificable, duplicado, ambigüedad,
   cobertura parcial y dato no calculable.
9. Exponer contratos mínimos de lectura para E4.7, E4.11 y E4.12 sin implementar esos
   consumidores.

### Autoridad, alcance y frontera

| Contrato | Autoridad | E4.5 |
| --- | --- | --- |
| Archivo precontrol no duplica Gastos; cierres trimestrales inmutables | R6/P6 | Reafirma; crea una fuente separada y un combinador verificable |
| IDs estables, aperturas, hechos, históricos y auxiliares preservados | P6 | Consume y conserva; no reescribe fuentes existentes |
| Partida/Referencia por ID; renombrar conserva enlaces | E1.2/P4/E1.5/P2 | Mapping por identidad de origen y destino por ID; el nombre no es clave |
| Gastos detallados: solo Movimientos Tipo Gasto, vigentes, con Fecha real | E1.4 | Consume; no crea Movimientos ni suma Ingresos/Transferencias/Amortización |
| Plan anual por Partida/ejercicio; histórico válido sin doble cómputo | E2.4 | Entrega el proveedor y la cobertura que E2.4/E4.7 consumen |
| Aperturas de Saldo: posición inicial, no Movimiento; ausencia ≠ cero | E1.1/F3 | Conserva; no escribe ni recalcula aperturas |
| Apertura/condiciones de Deuda: E1.6/E4.4, no E4.5 | E1.6/E4.4 | E4.5 no enlaza aperturas de Deuda, no las duplica y no las convierte en Saldo/Movimiento |
| Deuda: apertura, precontrol y amortización real desde Inicio control | E1.6/E4.4 | No reconstruye amortizaciones ni sustituye el motor de Deuda; el precontrol de Deuda se muestra solo como contexto, no como apertura E4.5 |
| Cierre y fotografía son posteriores, inmutables y distintos | P1/P5/E4.9–E4.11 | No crea fotos ni convierte archivo en foto |
| Regularización 2026 específica | R3/E2.4/E4.5-AC3 | Excepción explícita, solo 2026, sin regla general |
| Datos reales solo con autorización P6/P7 | Seguridad/P6/P7 | Solo fixtures ficticios; sin Excel ni importador real |

E4.5 **no** declara implementados los contratos futuros de E4.7, E4.11 o E4.12. Los
consume como consumidores previstos y define sus invariantes mínimos.

### Definiciones verificables

| Término | Definición | Fuente única | No es |
| --- | --- | --- | --- |
| Archivo histórico | Conjunto de registros históricos/precontrol de solo lectura, con origen y cobertura | Registro de archivo + mapping | Segundo ledger, plan, foto o Movimiento |
| Hecho detallado | Gasto/Ingreso/Transferencia/Amortización registrado con ID y Fecha | Movimientos y motores E1/E2/E3 | Un agregado histórico sin ID individual |
| Fotografía | Instantánea persistida e inmutable de ciclo/trimestre/año | E4.11 | Archivo importado, cálculo actual o cierre por sí sola |
| Cierre financiero | Evento manual que bloquea y captura el estado de un ciclo | E4.9/E4.10 | Fotografía trimestral/anual ni archivo |
| Corte de archivo | Último día civil cubierto por una fuente de archivo verificada, inclusivo | Dataset/mapping aprobado | Fecha global, `hoy` o fecha de cierre |
| Inicio de control detallado | Primer día civil en el que los hechos detallados se consideran completos para el dataset | Dataset/mapping aprobado | Fecha de creación de la app ni fecha de un Movimiento |
| Cobertura | Unión de intervalos verificados de archivo y control detallado | Cálculo de cobertura | Presencia de una tabla o de una fila |
| Hueco | Intervalo de días sin cobertura verificada | Cálculo de cobertura | Ausencia de hechos (puede haber cobertura vacía) |
| Mapping | Enlace versionado entre identidad de origen y destino interno por ID | Registro de mapping | Búsqueda por nombre o prefijo |
| Registro representado | Registro de archivo ya incluido en un hecho detallado, con vínculo verificable | Vínculo de origen + mapping | Coincidencia de importe o de nombre |
| Total verificado | Suma de archivo y detalle elegible con cobertura continua hasta el corte | Combinador E4.5 | Suma de subtotales con huecos, overlap o registros sin mapping |
| Subtotal conocido | Suma de los registros no conflictivos, aunque no cubra todo el intervalo | Combinador E4.5 | Total anual completo |
| Regularización 2026 | Registro explícito, fechado y acotado al ejercicio 2026 | Registro de archivo + mapping aprobado | Regla general, campo del plan o inferencia por nombre |
| Transición de ejercicio | Consulta separada de dos ejercicios naturales contiguos | Vista de transición | Migración o copia de datos |

## Data model and contracts

Modelo lógico documental; no DDL, no migración y no versión de esquema asignada. Los
nombres son contratos de lectura propuestos, no tablas creadas.

### Registro de archivo histórico

| Dato | Contrato | Fuente / derivación | Límite |
| --- | --- | --- | --- |
| `tipoRegistro` | `Archivo` en este contrato; `Foto` pertenece a E4.11 | Servidor | No se usa `Foto` para un archivo |
| `idArchivo` | ID interno estable, único, inmutable, no reutilizado; propuesta `AHxxx` | Servidor / fixture | Nunca fila, nombre o fecha como identidad |
| `ejercicio` | Año natural 1–9999 | Fuente/mapping | No es ID de Ciclo ni mes financiado |
| `intervalo.inicio/fin` | Fechas civiles inclusivas, dentro del ejercicio, `inicio <= fin` | Fuente/mapping | No se infiere por mes ni por fecha de carga |
| `partidaId` | `PARxxx` o `null` | Mapping aprobado | `null` no se rellena por nombre; el total global queda `NoVerificable` |
| `referenciaId` | `REFxxx` o `null` | Mapping aprobado | El nombre no es clave; renombrar conserva el ID |
| `clase` | `GastoHistorico`, `Regularizacion2026` o `AperturaHistorica` si Q7 se aprueba | Fuente/mapping | No se inventan clases para Ingresos/Transferencias |
| `saldoId` | `Sxxx` solo para `AperturaHistorica`; `null` en gastos | Mapping `Saldo` | No se escribe en `Saldos`; no suma a Gastos |
| `importeCentimos` | Entero exacto de céntimos en el modelo; el DTO expone `importe` como string decimal exacto (`"1200.00"`), nunca `number` | Fuente | `GastoHistorico` no negativo; apertura admite signo; regularización pendiente de Q5 |
| `fecha` | Fecha civil conocida o `null` | Fuente | No se inventa; si existe, dentro del intervalo |
| `procedencia.documentoHash` | Huella SHA-256 del documento fuente, sanitizada | Extracción autorizada / fixture | No se publica el documento |
| `procedencia.hojaTabla` | Hoja/tabla/bloque de origen | Extracción / fixture | Texto acotado, sin datos personales |
| `procedencia.idOrigen` | ID original si existe, como texto | Fuente | Se conserva; no se reutiliza como ID interno |
| `procedencia.fila/columna` | Coordenada de origen si aplica | Extracción / fixture | No es clave por sí sola |
| `procedencia.extraidoEn` | Fecha/hora técnica UTC | Extracción | No es fecha financiera |
| `procedencia.versionMapping` | Versión del mapping usada | Mapping | Visible en consulta y auditoría |
| `huellaContenido` | Huella de los valores normalizados del registro | Servidor | Detecta duplicado/conflicto, no autoriza suma |
| `estadoVerificacion` | `Verificado`, `NoVerificado` o `Rechazado` | Fuente/revisión | Solo `Verificado` entra en un total |
| `estadoMapeo` | `Mapeado`, `Pendiente`, `Ambigua` o `Excluido` | Mapping | Solo `Mapeado` entra en total por Partida |
| `representadoEnMovimientos` | `Si`, `No` o `Desconocido` | Vínculo de origen verificado | `Si` exige vínculo y excluye el archivo; el Movimiento vinculado cuenta una vez; `Desconocido` con overlap impide total |
| `version` | Versión inmutable del registro; `reemplazaA` si corrige | Servidor | Solo la vigente suma; anteriores se conservan como historia; no DELETE |
| `nota` | Texto opcional acotado | Fuente/revisión | No se usa para clasificar |

Reglas del registro:

- Un registro `Verificado` y `Mapeado` es candidato a suma; uno `NoVerificado`,
  `Rechazado`, `Pendiente`, `Ambigua` o `Excluido` no entra en el total y se muestra
  con motivo.
- `partidaId=null` no se convierte en una Partida «varios» ni se reparte por importe.
  Se muestra en «Sin clasificar» y deja el total global `NoVerificable`; la cobertura
  puede seguir siendo completa.
- `fecha=null` no se sustituye por el inicio/fin del intervalo ni por el reloj. Si hay
  un importe positivo sin fecha, el importe puede mostrarse, pero la fecha ejecutada
  permanece desconocida.
- La ausencia de `fecha` no impide sumar si la cobertura y el mapping son verificables;
  sí impide atribuir una fecha ejecutada concreta.
- Un registro `AperturaHistorica` no suma al ejecutado de Gastos, no acredita cobertura
  de Gastos (no puede producir un 0 falso) y no se escribe en `Saldos` ni en `Deudas`.
  Su `saldoId` se resuelve solo por mapping `Saldo`; si Q7 no se aprueba, esta clase no
  se implementa.
- **Aperturas de Deuda no pertenecen a E4.5.** E4.5 no ofrece `tipoDestino=Deuda` ni
  enlaza una apertura de Deuda a `Dxxx`. Si la fuente contiene una, se muestra como
  «No soportado por E4.5; ver E4.4», no se mapea, no se suma y no modifica capital,
  condiciones ni precontrol de Deuda. E4.4 conserva esa responsabilidad.
- **Ausencia ≠ cero:** `aperturas=null` significa «sin evidencia de apertura»; solo se
  muestra `0,00` si existe una apertura cero verificada. No se rellena con cero por
  defecto ni se deriva de un Gasto o de un importe histórico.

### Mapping versionado

| Dato | Contrato | Límite |
| --- | --- | --- |
| `idMapeo` | ID estable de la versión de mapping | No se reutiliza |
| `identidadOrigen` | Documento + hoja/tabla + ID de origen o coordenada; etiqueta inmutable de origen solo si está aprobada | El nombre editable solo no es identidad |
| `nombreOrigen` | Nombre original conservado para procedencia | No es clave |
| `tipoDestino` | `Partida`, `Referencia` o `Saldo` (apertura, si Q7) | No `Deuda` en E4.5 |
| `destinoId` | `PARxxx`, `REFxxx` o `Sxxx` según tipo | Debe existir; no se crea en la consulta |
| `estado` | `Aprobado`, `Pendiente`, `Ambigua` o `Rechazado` | Solo `Aprobado` permite sumar |
| `evidencia` | Fuente/fecha/actor de aprobación, texto acotado | Sin datos personales |
| `vigenteDesde/Hasta` | Fechas civiles de vigencia del mapping | Dos mappings incompatibles no pueden estar vigentes a la vez |
| `reemplazaA` | Versión anterior si procede | Conserva historia; no sobrescribe |
| `version` | Versión inmutable | Visible en cada registro y consulta |

Reglas de mapping:

- El destino se resuelve por ID; renombrar `PARxxx`/`REFxxx` no cambia el enlace.
- Si dos destinos compiten por la misma identidad, el mapping es `Ambigua` y el
  registro no se suma hasta que una versión aprobada lo resuelva.
- Si el origen solo tiene un nombre y no hay ID/coordenada estable, el mapping no se
  aprueba automáticamente; se marca `Pendiente` o `Ambigua`.
- Una versión nueva no reescribe registros anteriores: cada registro conserva la
  versión usada y la consulta muestra la versión vigente y la original.
- No se crean Partidas/Referencias/Saldos desde E4.5. El destino debe existir antes.

### Cobertura y corte

| Dato | Contrato |
| --- | --- |
| `universo` | `{inicio: YYYY-01-01, fin: YYYY-12-31}` del ejercicio consultado |
| `corteConsulta` | Fecha civil inclusiva solicitada; dentro del ejercicio y no posterior a hoy (Europe/Madrid) |
| `fuentes[]` | Cada fuente: `etiqueta`, `alcance` (`Global` o `PARxxx`), `huella`, `corteArchivo`, `intervalosArchivo[]` (con `partida`), `controlDetalle{inicio,fin}`, `versionMapping`, `claseCobertura` |
| `ultimoDatoVerificado` | Último día con dato verificado de las fuentes; informativo, no sustituye `corteConsulta` ni el corte de cada fuente |
| `intervalosArchivo` | Intervalos verificados de Gastos históricos/regularización; no incluye aperturas |
| `detalleControl` | Gastos dentro de los `controlDetalle` de las fuentes; no incluye el tramo precontrol |
| `detallePrecontrol` | Gastos conocidos anteriores al control: `vinculado` (sustituye a un archivo representado) o `noVinculado` (contexto, no total) |
| `huecos` | Intervalos sin cobertura verificada entre el inicio del ejercicio y `corteConsulta` |
| `estadoCobertura` | `Completa`, `Parcial`, `Solapada` o `NoDisponible` |
| `estadoTotal` | `Verificado`, `NoVerificable` o `NoDisponible` |
| `motivoCodigo` | `SinFuente`, `HuecoCobertura`, `Solapamiento`, `DuplicadoAmbiguo`, `MappingPendiente`, `VerificacionPendiente`, `RegularizacionPendiente`, `AperturaNoGasto`, `AgregadoNoAtribuibleAlCorte` |
| `motivo` | Explicación legible y estable; no un importe |

Reglas de cobertura:

- Cada fuente declara su propio `corteArchivo` y `controlDetalle`. Un corte de una
  fuente no completa otra; no se sintetiza un corte global. Cada `controlDetalle` se
  aplica solo a las Partidas de su `alcance` (`Global` o `PARxxx`): un Gasto de PAR100
  no se considera control por el tramo de una fuente cuyo alcance es PAR205. El control
  y el precontrol se clasifican por `(Partida, fuente)` y se deduplican por ID de
  Movimiento.
- La cobertura se calcula por **unión de intervalos civiles inclusivos** de Gastos
  históricos/regularización y de los `controlDetalle`, no por meses, filas o presencia
  de una tabla. Los intervalos de `AperturaHistorica` se excluyen de la cobertura de
  Gastos y se muestran aparte.
- La cobertura puede ser global o por Partida (`alcance`). `items[].estadoCobertura`
  es el de esa Partida; el estado global es el peor de los alcances (`NoDisponible` >
  `Solapada` > `Parcial` > `Completa`). `huecos[]` incluye `partida` o `null` cuando
  el hueco es global.
- `estadoCobertura=Completa` exige que la unión cubra **todos los días** desde
  `universo.inicio` hasta `corteConsulta`, sin huecos ni solapamientos no resueltos.
  `Parcial` si hay huecos; `Solapada` si hay solapamiento no resuelto;
  `NoDisponible` si no hay fuente/intervalo verificado.
- `estadoTotal=Verificado` exige cobertura completa, todos los registros elegibles
  `Verificado`+`Mapeado`, sin conflictos, sin `sinClasificar` y sin
  `detallePrecontrolNoVinculado`. Si falta cualquiera, `NoVerificable`; si no hay
  fuente/cobertura, `NoDisponible`. `NoCombinable` es un `motivoCodigo`, no un estado
  de cobertura.
- Un registro sin mapping no vuelve `Parcial` la cobertura: la cobertura puede ser
  completa y el total quedar `NoVerificable` con subtotal. Un hueco sí vuelve
  `Parcial` la cobertura.
- Para un **total anual** se exige además `corteConsulta = 31/12` del ejercicio. Una
  consulta a 30/06 solo puede declarar «cobertura hasta 30/06», no un año completo.
- Un intervalo verificado sin hechos es cobertura válida y produce 0 para ese intervalo.
  Una tabla instalada o una consulta vacía no acreditan cobertura.
- Si un registro de archivo es un **agregado cuyo intervalo no está completamente
  contenido en `[universo.inicio, corteConsulta]`**, no se incluye en el total ni se
  prorratea. Su parte anterior al corte no se acredita como importe separable: se
  muestra como contexto y activa `motivoCodigo=AgregadoNoAtribuibleAlCorte`. La
  cobertura temporal puede ser `Completa` si el intervalo cubre `[inicio, corte]`,
  pero **no acredita atribución de importe ni ausencia de conflicto**:
  `estadoTotal=NoVerificable`, total y subtotal `null`. Que el detalle cubra todo
  `[universo.inicio, corteConsulta]` **no basta** para verificar solo con detalle: el
  agregado puede solaparse con él y no se prioriza el detalle automáticamente. Para
  sumar solo detalle se exige evidencia explícita: vínculo de origen verificado
  (`representadoEnMovimientos=Si` con el Movimiento/registro identificado) o una
  separación/disyunción aprobada que demuestre que el agregado no contiene esos
  hechos. Sin esa evidencia, el resultado sigue `NoVerificable` y la preferencia queda
  en Q10. No se convierte el agregado en un total parcial inventado.
- El corte de 2026 de C30 (27/08/2026) y el control desde 28/08/2026 son **solo** el
  ejemplo de las Deudas allí indicadas. No son un default global ni una fecha fija de
  E4.5; cada dataset debe declarar los suyos.
- Un `corteConsulta` o un `controlDetalle.fin` posterior a la fecha civil actual no es
  verificable: la consulta responde 422 o `NoVerificable`, nunca un total anual
  ficticio. Los ejemplos de total anual 2026 de esta spec se ejecutan con un reloj de
  prueba posterior al 31/12/2026 o se leen como ejercicio pasado; no se consulta el
  futuro con el reloj real.

### Combinador archivo + Gastos

El combinador es una función de lectura, no una tabla persistida. Recibe ejercicio,
corte y filtro opcional de Partida, y sigue este orden:

1. **Validar entrada.** Ejercicio válido; corte dentro del ejercicio y no futuro;
   Partida existente si se filtra. Un corte inválido no devuelve un total.
2. **Leer detalle de control.** Para cada fuente, Gastos vigentes (`tipo=Gasto`,
   `anulado=0`) de las Partidas de su `alcance` y con Fecha dentro de su
   `controlDetalle`, recortado al ejercicio y al corte. Un Gasto de otra Partida no se
   considera control por ese tramo. Deduplicar por ID de Movimiento si dos fuentes
   cubren la misma Partida. No se suman Ingresos, Transferencias ni Amortización deuda.
3. **Leer detalle precontrol.** Gastos vigentes anteriores al control de su Partida,
   separados en `vinculado` (con vínculo de origen a un archivo que se excluye por
   `representadoEnMovimientos=Si`) y `noVinculado` (contexto conocido, no total). Un
   Movimiento vinculado cuya Fecha esté dentro del control de su Partida ya está en
   `detalleControl`: no se añade a precontrol y se deduplica por ID de Movimiento. Solo
   un Movimiento vinculado anterior al control entra como `detallePrecontrolVinculado`.
4. **Leer archivo.** Registros `Verificado` + `Mapeado`, con intervalo dentro del
   ejercicio y del corte, y `representadoEnMovimientos` distinto de `Si`. Un agregado
   cuyo intervalo exceda el corte no se recorta ni se prorratea: se conserva como
   contexto no atribuible y activa `AgregadoNoAtribuibleAlCorte`.
5. **Aplicar exclusiones.** `representadoEnMovimientos=Si` excluye el archivo. El
   Movimiento vinculado cuenta una vez: si su Fecha está dentro del control de su
   Partida, ya está en `detalleControl`; si es anterior, entra como
   `detallePrecontrolVinculado`.
   Si no hay vínculo verificable, el archivo no se excluye silenciosamente: el total
   queda `NoVerificable`. Un registro `AperturaHistorica` se muestra aparte y no entra en
   cobertura ni total de Gastos. `representadoEnMovimientos=Desconocido` con
   solapamiento impide el total.
6. **Detectar conflictos.** Solapamiento archivo–archivo, archivo–detalleControl o
   archivo–detallePrecontrol no vinculado; duplicado de identidad con contenido
   distinto; o dos fuentes distintas para el mismo intervalo/Partida, aunque el
   importe difiera. Cualquier conflicto no resuelto deja `estadoTotal=NoVerificable`.
7. **Calcular cobertura.** Unir intervalos de Gastos históricos/regularización y los
   `controlDetalle`; recortar al universo/corte; calcular huecos y solapamientos.
8. **Calcular total.** Solo si `estadoCobertura=Completa`, no hay conflictos, todos
   los registros elegibles están verificados/mapeados y `detallePrecontrolNoVinculado`
   está vacío:
   `total = suma(archivo elegible) + suma(detalleControl) + suma(detallePrecontrolVinculado)`.
   Cada Movimiento y cada registro de archivo cuenta una sola vez, deduplicado por ID.
   Si no, `total=null`. `subtotalConocido` solo se calcula si los registros no
   conflictivos son separables; si un agregado contiene la parte solapada y no puede
   aislarse, `subtotalConocido=null` (no se elige fuente ni se prorratea).
9. **Exponer componentes.** `archivo`, `detalleControl`, `detallePrecontrolVinculado`,
   `detallePrecontrolNoVinculado`, `aperturas`, `total`, `subtotalConocido`,
   `estadoCobertura`, `estadoTotal`, `cobertura`, `corte`, `fuentes`, `procedencia`,
   `motivoCodigo`, `motivo`, `sinClasificar`, `conflictos[]` y
   `agregadoNoAtribuible[]`. No se oculta un componente para que el total parezca
   completo.

Reglas adicionales:

- **No se resta** el detalle del archivo ni el archivo del detalle. Un agregado
  histórico sin detalle no permite calcular la parte que ya está en Movimientos; la
  resta sería una invención. Se muestran por separado y el total queda no calculable.
- **No se deduplica por importe, nombre o mes.** La identidad es la identidad de origen
  + huella; la coincidencia de importe no demuestra el mismo hecho.
- **Fecha de corte inclusiva.** Un hecho del mismo día del corte entra; un archivo que
  termina el 27/08 y un detalle que empieza el 28/08 son contiguos; si el detalle
  empieza el 27/08, hay solapamiento.
- **Un día de hueco** (`2026-07-31` sin archivo ni control) impide el total anual,
  aunque los importes conocidos sean pequeños.
- **Un año futuro** no tiene cobertura; no se presenta 0 anual.
- **Un ejercicio pasado con corte 31/12** y cobertura completa puede dar 0 verificado
  si no hay hechos; ese 0 es un resultado, no una ausencia.

### Transición de ejercicio

La transición es una **vista de consulta**, no una migración:

- Cada hecho pertenece al ejercicio natural de su Fecha; un Ciclo que cruza diciembre/
  enero no mueve el hecho de año.
- Consultar 2027 no arrastra archivo, plan, aperturas, hechos ni fotos de 2026. Cada
  ejercicio tiene su propia cobertura.
- No se crean líneas de plan, Movimientos, aperturas, Deudas, fotos, cierres ni mappings
  por el simple cambio de año.
- Si 2027 no tiene archivo ni control detallado, su estado es `NoDisponible`, no 0.
- 2026 sigue consultable después de pasar a 2027; no se borra ni se reetiqueta.
- La vista de transición puede mostrar ambos ejercicios, pero no suma un total
  plurianual ni convierte el cierre de 2026 en apertura de 2027.
- Si un Ciclo abarca ambos años, la vista muestra los dos totales anuales separados y
  el ciclo como contexto, sin reasignar importes.

### Regularización válida de 2026

La regularización de 2026 es una **excepción documentada**, no una regla general:

- Solo se acepta con `clase=Regularizacion2026`, `ejercicio=2026`, intervalo dentro de
  2026, importe/signo explícito, `partidaId`/`referenciaId` si procede, procedencia,
  mapping aprobado y motivo.
- No se infiere por el texto «regularización», por el nombre de una hoja, por un
  prefijo de ID ni por el año de la consulta.
- Se incluye en el total de 2026 solo si está verificado, mapeado, no representado y
  sin conflicto. Si ya está representada por un **registro/vínculo de identidad** en
  el archivo o en Movimientos, se excluye ese registro una vez y se muestra el vínculo;
  no se excluye por coincidencia de importe. Si está embebida en un agregado sin
  registro separable, no se resta del agregado: se muestra el motivo y el total queda
  `NoVerificable`.
- No se aplica a 2025, 2027 ni a otro ejercicio; no se copia a un plan; no se
  convierte en campo reutilizable; no se generaliza a «regularizaciones».
- La UI lo etiqueta «Regularización 2026 (excepción documentada)» y muestra su fuente.
- Sin evidencia suficiente (naturaleza, signo, inclusión, Partida/Referencia), el
  registro queda `Pendiente`/`NoVerificado` y no se suma. No se rellena con una regla
  inventada.
- La decisión exacta sigue siendo Q5/DT7; esta spec no la declara aprobada.

### IDs, trazabilidad y duplicados

- `idArchivo` es interno, estable e inmutable; `idOrigen` se conserva como procedencia.
  No se reutiliza un ID eliminado; no hay DELETE de archivo.
- La huella de contenido detecta el mismo registro y los cambios de contenido. Misma
  identidad + misma huella = un registro; misma identidad + huella distinta = conflicto.
- Dos registros de la misma fuente con la misma identidad no se suman dos veces.
- Dos fuentes distintas con el mismo intervalo/Partida son **procedencia ambigua**,
  aunque el importe difiera; no se suman ni se elige una por importe hasta que una
  revisión aprobada lo resuelva.
- Un registro `representadoEnMovimientos=Si` requiere vínculo verificable (ID/origen),
  no una coincidencia de importe. Si el vínculo es dudoso, se marca `Desconocido` y el
  conflicto impide el total.
- Las correcciones de archivo se hacen por una nueva versión con `reemplazaA`, motivo
  y auditoría; no se sobrescribe la anterior. La vía de carga/corrección real queda
  fuera de E4.5.

### Vigencia, versiones y clasificación

- **Solo la versión vigente contribuye.** Para una misma identidad de archivo, el
  combinador usa la última versión de la cadena `reemplazaA` marcada como vigente; las
  versiones anteriores se conservan como historia y **no se suman**. Si la cadena se
  bifurca o hay dos vigentes incompatibles, el total queda `NoVerificable`.
- **Corrección:** una nueva versión puede cambiar importe, intervalo, fecha, Partida o
  Referencia, pero debe declarar `reemplazaA`, motivo, actor y fecha. La original no se
  borra ni se reescribe; deja de contribuir al total en cuanto la sustitución es
  vigente. No se suma original + sustitución.
- **Mapping:** cada registro conserva `versionMappingUsada`. Una versión nueva de
  mapping no reescribe registros anteriores; se aplica a nuevos registros o a una nueva
  versión de archivo que lo declare. La consulta muestra la versión usada por el
  registro y la vigente del mapping.
- **Renombrado:** mismo `destinoId` (`PARxxx`/`REFxxx`) y solo cambia el nombre. No es
  reclasificación, no crea nueva versión de archivo y conserva enlaces; la consulta
  muestra el nombre vigente y la procedencia conserva el nombre original.
- **Reclasificación:** cambia el destino a otro `PARxxx`/`REFxxx` o cambia la Partida de
  un registro. No es un renombrado: exige nueva versión de mapping y de archivo, motivo,
  evidencia y auditoría; la clasificación original queda en la versión/procedencia
  anterior. Solo la versión vigente contribuye.
- **Cambio de jerarquía con el mismo `PARxxx`:** conservar la identidad **no elimina
  el impacto histórico**. Mover una Partida a otra Subcategoría/Categoría no cambia su
  `PARxxx` ni crea una reclasificación del registro a otra Partida, pero es un cambio
  de catálogo con impacto: exige el contrato E1.2 de vista/impacto, motivo,
  confirmación, revisión/huella y protecciones de los consumidores afectados; **no es
  un simple renombrado**. La procedencia original conserva la jerarquía de extracción;
  la consulta muestra la jerarquía vigente y la original, y los informes declaran qué
  jerarquía usan. No se introduce versionado de catálogo no aprobado ni se reescribe
  la historia. Si además cambia el destino a otro `PARxxx`, es reclasificación y sigue
  la regla anterior.
- **Fecha ejecutada (E2.4):** se toma solo de `fecha` conocida de la versión vigente y
  de las fechas de Gastos elegibles. Si `fecha=null`, no se deriva del intervalo, del
  corte ni del reloj; `fechaEjecutada` queda `null` o se limita a otras fechas conocidas.
  Una fecha corregida solo cuenta si la nueva versión es la vigente.

## Screens and interfaces

La pantalla se llama **Histórico** y es de solo lectura. Reutiliza el shell, la
tipografía, los tokens y los componentes existentes (`PageHead`, `Alert`, `Tag`), sin
tema oscuro ni librería nueva. No incluye acciones de importar, editar, crear Movimiento
ni cerrar. Los wireframes son propuestas documentales, no UI implementada.

### Escritorio 1440

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ MyFinanzas       Ciclo financiado: 2026-05 · [Histórico] [Movimientos] ... │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ Saldos       │ Histórico precontrol                         Ejercicio [2026 v]│
│ Clasificación│ Corte [31/12/2026] · Cobertura global: Parcial (PAR205)       │
│ Movimientos  │ PAR100 01/01–27/08 + 28/08–31/12 · PAR205 falta 01/07–31/07   │
│ Histórico ◀  │ ┌───────────────────────────────────────────────────────────┐ │
│ ...          │ │ Aviso: 1 registro sin clasificar. Total no verificable.   │ │
│              │ └───────────────────────────────────────────────────────────┘ │
│              │ [Buscar Partida o ID] [Fuente v] [Limpiar]                     │
│              │ ┌───────────────────────────────────────────────────────────┐ │
│              │ │ Partida          Archivo    Detalle    Total    Cobertura    │ │
│              │ │ PAR100 Comida    1.200,00    300,00  1.500,00  Completa     │ │
│              │ │ PAR205 Viajes      800,00       —        —     Parcial      │ │
│              │ │ Sin clasificar     150,00       —        —        —         │ │
│              │ └───────────────────────────────────────────────────────────┘ │
│              │ Detalle de PAR100                                  [Ver registros]│
│              │ ┌───────────────────────────────────────────────────────────┐ │
│              │ │ Archivo 01/01–27/08 · 1.200,00 · Fuente SRC-1 · Mapping v3  │ │
│              │ │ Detalle 28/08–31/12 ·   300,00 · 3 Gastos · Cobertura OK │ │
│              │ │ Total verificado 1.500,00 · sin solapamiento              │ │
│              │ └───────────────────────────────────────────────────────────┘ │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

La fila «Sin clasificar» no tiene cobertura ni total propios: su mapping es ambiguo y
el total global queda `NoVerificable`. «Ambigua» es un estado de mapping, no de
cobertura.

### Móvil 390

```text
┌─────────────────────────────┐
│ MyFinanzas           ☰     │
│ Histórico precontrol        │
│ Ejercicio [2026 v]          │
│ Corte [31/12/2026]          │
│ Cobertura global: Parcial   │
│ PAR100 completa             │
│ PAR205 falta 01/07–31/07    │
│ [Ver cobertura]             │
├─────────────────────────────┤
│ ⚠ 1 registro sin clasificar │
│ Total no verificable        │
├─────────────────────────────┤
│ PAR100 · Comida             │
│ Archivo       1.200,00      │
│ Detalle         300,00      │
│ Total         1.500,00      │
│ Cobertura completa          │
│ [Ver registros]             │
├─────────────────────────────┤
│ PAR205 · Viajes             │
│ Archivo         800,00      │
│ Detalle             —       │
│ Total               —       │
│ Parcial: falta 01/07–31/07  │
│ [Ver cobertura]             │
├─────────────────────────────┤
│ Sin clasificar              │
│ 150,00 · mapping ambiguo    │
│ [Ver motivo]                │
└─────────────────────────────┘
```

### Ficha de registros y procedencia

```text
Registros y procedencia · PAR100
[Archivo] 01/01–27/08 · 1.200,00 · Verificado
  Fuente SRC-1 · hoja Archivo · fila 12 · hash ficticio · Mapping v3 → PAR100
[Detalle] 28/08–31/12 · 300,00 · 3 Gastos
  Movimientos 123, 124, 125 · Gastos vigentes · Fecha real
[Regularización 2026 (excepción documentada)] 15/06 · 50,00 · Solo 2026
  Fuente F-R26 · mapping v3 → PAR900 · no representada en Movimientos
[Sin clasificar] 150,00
  Motivo: dos candidatos PAR205/PAR206; no se suma hasta resolver
```

Reglas visuales:

- El resumen de procedencia y cobertura es siempre visible; el detalle completo se abre
  en una ficha accesible, también en móvil, sin depender de un tooltip.
- Los importes usan cifras tabulares y formato `1.234,56 €`; las fechas `dd/mm/aaaa`.
- El estado no se comunica solo por color: texto «Cobertura: Completa/Parcial/Solapada/
  No disponible» y «Total: Verificado/No verificable/No disponible».
- «—» significa no calculable, no cero. `0,00 €` solo se muestra si es un cero
  verificado.
- La tabla de escritorio se convierte en tarjetas en móvil; no hay scroll horizontal.
- No hay botones de edición, importación, alta, cierre ni borrado. Solo consulta,
  filtros, «Ver cobertura» y «Ver registros».
- Foco visible, etiquetas asociadas, navegación por teclado y anuncios de estado.
- El filtro de ejercicio no usa el reloj para seleccionar el año; el año inicial es
  explícito (por ejemplo, el último ejercicio con datos o el actual como contexto,
  sin convertirlo en fuente financiera).

## Empty, loading and error states

| Estado | Comportamiento |
| --- | --- |
| Cargando | «Cargando histórico…»; no mostrar 0, total ni filas supuestas |
| Sin archivo y sin detalle | «No hay archivo histórico para este ejercicio»; no crear plan/foto/Movimiento |
| Sin archivo pero con detalle | Mostrar detalle y cobertura parcial; no presentar el detalle como archivo |
| Cobertura completa sin hechos | Mostrar 0,00 verificado y «Sin hechos en el intervalo cubierto» |
| Cobertura parcial | Mostrar intervalos, huecos y subtotal; total «—» con motivo |
| Solapamiento | «Total no verificable: archivo y detalle se solapan en [fecha]»; componentes separados |
| Duplicado mismo origen | Una fila; aviso de duplicado absorbido por identidad/huella |
| Fuentes ambiguas | Dos candidatos visibles; no suma; acción solo de consulta |
| Sin mapping | Sección «Sin clasificar»; cobertura puede ser completa; total `NoVerificable`; no asignación automática |
| No verificable | Mostrar motivo; no sustituir por 0 ni por importe estimado |
| Ejercicio futuro | «Sin cobertura para un ejercicio futuro»; no total 0 |
| Corte inválido/futuro | 422 con campo/fecha y foco; no consulta silenciosa |
| Error de red | Reintento; conservar filtros y ejercicio; no demo |
| 401/403 | Sesión/MFA/CSRF; no filtrar importes ni SQL |
| Error técnico | Mensaje genérico con `requestId`; sin payload financiero en logs |

## API behavior and external dependencies

Propuesta conceptual; no rutas implementadas. Se reutiliza Effect HTTP, autenticación
MFA, CSRF/Origin, límite JSON, errores `Problem`, snapshot transaccional y `no-store`.
E4.5 no crea endpoints de escritura. La UI muestra siempre el campo `Corte`; por
defecto usa 31/12 en ejercicios pasados y `min(hoy, 31/12)` en el ejercicio actual,
sin convertirlo en fuente financiera. Un corte futuro se rechaza con 422 y foco en
ese campo.

| Operación | Comportamiento |
| --- | --- |
| `GET /api/historico/ejercicios` | Ejercicios con archivo/cobertura y estado; sin importes inventados |
| `GET /api/historico?ejercicio=YYYY&corte=YYYY-MM-DD` | Resumen por Partida, componentes archivo/detalle, cobertura, procedencia y `sinClasificar` |
| `GET /api/historico?ejercicio=YYYY&corte=...&partida=PARxxx&fuente=...` | Igual, filtrado por Partida y fuente; 404 solo si el ID no existe; una Partida inactiva con historia sigue consultable |
| `GET /api/historico/registros/:idArchivo` | Registro, versión, mapping, procedencia y vínculos; solo lectura |
| `GET /api/historico/cobertura?ejercicio=...&corte=...` | Intervalos, huecos, fuentes, corte y control por fuente; no importes ocultos |
| `GET /api/historico/transicion?desde=YYYY&hasta=YYYY` | Vista de dos ejercicios; `planesCreados=false`, `hechosCreados=false`, `aperturasCreadas=false`, `fotosCreadas=false`, `cierresCreados=false` |
| `GET /api/historico/mapeos?ejercicio=...` | Mapping vigente/histórico de solo lectura; no edición |
| `POST/PATCH/DELETE /api/historico/*` | 405/422; no hay escritura, importación ni corrección en E4.5 |

DTO mínimo propuesto:

```json
{
  "tipoRegistro": "Archivo",
  "ejercicio": 2026,
  "corte": "2026-12-31",
  "cobertura": {
    "estadoCobertura": "Parcial",
    "estadoTotal": "NoVerificable",
    "ultimoDatoVerificado": "2026-12-31",
    "huecos": [{"inicio": "2026-07-01", "fin": "2026-07-31", "partida": "PAR205"}],
    "fuentes": [{
      "etiqueta": "SRC-1",
      "alcance": "PAR100",
      "huella": "ficticia-1",
      "corteArchivo": "2026-08-27",
      "intervalos": [{"inicio": "2026-01-01", "fin": "2026-08-27", "partida": "PAR100", "clase": "GastoHistorico"}],
      "controlDetalle": {"inicio": "2026-08-28", "fin": "2026-12-31"},
      "versionMapping": "v3",
      "claseCobertura": "GastoHistorico"
    }, {
      "etiqueta": "SRC-2",
      "alcance": "PAR205",
      "huella": "ficticia-2",
      "corteArchivo": "2026-06-30",
      "intervalos": [{"inicio": "2026-01-01", "fin": "2026-06-30", "partida": "PAR205", "clase": "GastoHistorico"}],
      "controlDetalle": {"inicio": "2026-08-01", "fin": "2026-12-31"},
      "versionMapping": "v3",
      "claseCobertura": "GastoHistorico"
    }]
  },
  "items": [{
    "partida": {"id": "PAR100", "nombre": "Comida", "estado": "Activa"},
    "archivo": "1200.00",
    "detalleControl": "300.00",
    "detallePrecontrol": {"vinculado": "0.00", "noVinculado": "0.00"},
    "aperturas": null,
    "total": "1500.00",
    "subtotalConocido": "1500.00",
    "estadoCobertura": "Completa",
    "estadoTotal": "Verificado",
    "motivoCodigo": null,
    "motivo": null,
    "registros": ["AH001", "AH002"]
  }, {
    "partida": {"id": "PAR205", "nombre": "Viajes", "estado": "Activa"},
    "archivo": "800.00",
    "detalleControl": "0.00",
    "detallePrecontrol": {"vinculado": "0.00", "noVinculado": "0.00"},
    "aperturas": null,
    "total": null,
    "subtotalConocido": "800.00",
    "estadoCobertura": "Parcial",
    "estadoTotal": "NoVerificable",
    "motivoCodigo": "HuecoCobertura",
    "motivo": "Falta 01/07–31/07",
    "registros": ["AH004"]
  }],
  "sinClasificar": [{"idArchivo": "AH003", "importe": "150.00", "motivo": "Mapping ambiguo"}],
  "conflictos": [],
  "agregadoNoAtribuible": [],
  "totales": {
    "valor": null,
    "subtotalConocido": "2300.00",
    "estadoTotal": "NoVerificable",
    "motivoCodigo": "HuecoCobertura",
    "motivo": "PAR205: falta 01/07–31/07; 1 registro sin clasificar"
  }
}
```

Ejemplo separado de conflicto F2 (consulta distinta; no se mezcla con el DTO anterior):

```json
{
  "tipoRegistro": "Archivo",
  "ejercicio": 2026,
  "corte": "2026-12-31",
  "items": [{
    "partida": {"id": "PAR100", "nombre": "Comida", "estado": "Activa"},
    "archivo": "1200.00",
    "detalleControl": "320.00",
    "detallePrecontrol": {"vinculado": "0.00", "noVinculado": "0.00"},
    "total": null,
    "subtotalConocido": null,
    "estadoCobertura": "Solapada",
    "estadoTotal": "NoVerificable",
    "motivoCodigo": "Solapamiento",
    "motivo": "Archivo y detalle se solapan el 27/08; no se elige fuente ni se prorratea"
  }],
  "conflictos": [{
    "tipo": "Solapamiento",
    "partida": "PAR100",
    "intervalo": {"inicio": "2026-08-27", "fin": "2026-08-27"},
    "importe": "20.00",
    "fuente": "Movimientos",
    "motivo": "El 20,00 no se suma al subtotal"
  }]
}
```

Reglas de API:

- Importes como string decimal exacto; `null` para desconocido; `"0.00"` para cero
  verificado. No usar `number` para dinero. `aperturas=null` significa «sin evidencia
  de apertura»; solo una apertura cero verificada se representa `"0.00"`.
- `estadoCobertura`, `estadoTotal`, `motivoCodigo` y `motivo` acompañan a todo total;
  no se devuelve un total sin cobertura.
- `procedencia` incluye huella, hoja/tabla, fila/columna, ID de origen, fecha de
  extracción y versión de mapping; sin contenido personal ni el documento.
- `Cache-Control: no-store`; sin CORS comodín; sin logs de importes/notas.
- `corte` inválido o futuro -> 422; ejercicio inválido -> 422; Partida inexistente ->
  404; Partida inactiva con historia -> consultable; mapping pendiente -> sección
  separada, no 0; 422 solo para filtros estructuralmente inválidos.
- No se aceptan campos derivados (`total`, `cobertura`, `estado`, `representadoEnMovimientos`)
  como entrada; no hay entrada de archivo en esta entrega.
- Sin dependencias nuevas, ORM, servicios externos, Excel ni importador.

## Validation and edge cases

### Casos ficticios de referencia

Los cortes `31/12/2026` de estos ejemplos se evalúan con un reloj de prueba posterior a
esa fecha (o como ejercicio pasado). No se usa el reloj real para declarar un año en
curso completo; un corte futuro real devuelve 422/No verificable.

- **F1 — archivo y detalle contiguos.** PAR100/2026; archivo `01/01–27/08` 1.200,00;
  detalle `28/08–31/12` 300,00; mapping PAR100 v3; corte 31/12; cobertura completa;
  total 1.500,00, archivo 1.200,00, detalle 300,00, sin doble cómputo.
- **F2 — frontera exacta con solapamiento.** Archivo `01/01–27/08` 1.200,00;
  `controlDetalle.inicio=27/08`; detalle `27/08–31/12` 320,00 (20,00 el 27/08 + 300,00
  después). Hay solapamiento el 27/08 y no se puede aislar de forma demostrada. No se
  elige una fuente ni se prorratea: total y subtotal `null`; archivo 1.200,00 y detalle
  320,00 se muestran como componentes; el 20,00 aparece en `conflictos[]`. No se
  presenta 1.500,00 como subtotal ni 1.520,00 como total. La preferencia entre fuentes
  queda en Q10.
- **F3 — hueco.** Archivo `01/01–30/06` 900,00; detalle `01/08–31/12` 300,00; julio sin
  cobertura. Total `null`; subtotal 1.200,00; hueco `01/07–31/07`.
- **F4 — ausencia vs cero.** Cobertura completa `01/01–31/12` sin hechos: total 0,00
  verificado. Cobertura `01/09–31/12` sin archivo y sin control anterior: total `null`,
  motivo «cobertura anterior no verificada».
- **F5 — duplicados.** Dos filas idénticas de F1 (misma identidad/huella): una sola,
  1.200,00. F1 y F2 con el mismo intervalo/Partida, aunque el importe difiera: dos
  candidatos ambiguos, no se suman ni se elige uno; estado `Ambigua`.
- **F6 — renombrado.** PAR100 «Comida» → «Alimentación»; REF100 «Viaje X» → «Viaje Y»;
  mapping v3 sigue apuntando a PAR100/REF100; la consulta muestra el nombre vigente y la
  procedencia conserva el original. El total no cambia.
- **F7 — aperturas.** El archivo muestra una apertura histórica ficticia de 500,00 para
  S001; la ficha de S001 conserva 500,00 y su fecha; no se crea Movimiento ni se altera
  Deuda D100 (apertura 1.000,00, inicio control 28/08/2026). La apertura histórica se
  muestra aparte y no suma al ejecutado.
- **F8 — transición.** 2026 con archivo/detalle; 2027 sin archivo ni control. Consultar
  2027: `NoDisponible`, sin plan, sin Movimiento, sin foto, sin apertura nueva; 2026
  sigue consultable. Un Ciclo que cruza diciembre/enero no mueve los importes de año.
- **F9 — regularización 2026.** Registro `Regularizacion2026`, 2026, `15/06`, 50,00,
  PAR900, fuente F-R26, mapping v3, no representado. Se muestra solo en 2026; 2025 y
  2027 no cambian. Si ya está representada por identidad/origen en el archivo o en un
  Movimiento, se excluye ese registro una vez; no se excluye por coincidencia de
  importe. Si solo está embebida en un agregado sin registro separable, no se resta:
  total `NoVerificable`. Si solo se llama «regularización» sin tipo/mapping, queda
  `Pendiente` y no se suma.
- **F10 — sin mapping.** Fila de 150,00 con dos candidatos PAR205/PAR206: sección
  «Sin clasificar»; cobertura puede ser completa; total global `NoVerificable`; no se
  asigna por nombre.
- **F11 — archivo agregado y detalle parcial.** Archivo anual 1.200,00 sin desglose;
  detalle de septiembre 100,00. No se resta 100,00 del archivo; se muestran ambos y el
  total no es verificable si falta la separación. No se inventa 1.100,00.
- **F12 — año futuro.** Consulta 2027 sin corte ejecutado: `NoDisponible`; no 0 anual.
- **F13 — precontrol vinculado y no vinculado.** Movimiento 90 de 60,00 el 20/08,
  anterior al control de su Partida (`controlDetalle.inicio=01/09`). Si está vinculado a AH004 y esta se excluye
  por `representadoEnMovimientos=Si`, el Movimiento entra una vez como
  `detallePrecontrolVinculado`. Si el Movimiento vinculado estuviera dentro del control,
  ya estaría en `detalleControl` y no se añadiría otra vez. Si no hay vínculo, se muestra
  como `detallePrecontrolNoVinculado` y el total queda `NoVerificable`; no se omite ni se
  duplica.
- **F14 — apertura no acredita Gastos.** El archivo solo contiene una
  `AperturaHistorica` de 500,00 que cubre 01/01–31/12, sin fuente de Gastos ni control.
  La cobertura de Gastos es `NoDisponible`; no se presenta 0,00 de Gastos.
- **F15 — dos fuentes con cortes distintos.** SRC-1 cubre 01/01–31/08 con 500,00;
  SRC-2 cubre 01/03–30/06 con 300,00. El solapamiento 01/03–30/06 deja
  `estadoCobertura=Solapada` y total `NoVerificable`; no se suman 800,00 ni se elige una
  fuente.
- **F16 — representación desconocida.** Archivo de septiembre 100,00 y Gasto de
  septiembre 50,00 con `representadoEnMovimientos=Desconocido`. Hay solapamiento; total
  `NoVerificable`; no se excluye ni se incluye automáticamente.
- **F17 — solo Gastos en detalle.** Detalle con Ingreso 100,00, Transferencia 200,00,
  Amortización 300,00 y Gasto 50,00. El detalle elegible es 50,00; los demás no se suman
  al total de Gastos.
- **F18 — control por alcance de Partida.** SRC-1 tiene alcance PAR100 y control desde
  28/08; SRC-2 tiene alcance PAR205 y control desde 01/08. Un Gasto PAR100 del 15/08 no
  se considera control por SRC-2: es precontrol/no vinculado de PAR100 y deja el total
  `NoVerificable` si no hay vínculo. No se clasifica por la unión global de controles.
- **F19 — agregado que excede el corte.** Archivo agregado `01/01–27/08` 1.200,00 sin
  desglose y consulta a `30/06`. No se prorratea ni se recorta el importe; no hay total
  ni subtotal verificable, `estadoCobertura=Completa` (el intervalo cubre el corte),
  `estadoTotal=NoVerificable`, `motivoCodigo=AgregadoNoAtribuibleAlCorte`; el agregado
  se muestra en `agregadoNoAtribuible[]` como contexto, fuera del total. No se presenta
  1.200,00 como ejecutado hasta 30/06.
- **F19b — detalle completo pero conflicto no demostrado.** El mismo agregado
  `01/01–27/08` y un detalle que cubre `01/01–30/06`, sin vínculo
  `representadoEnMovimientos=Si` ni separación/disyunción aprobada. La cobertura
  temporal es completa, pero el agregado puede contener los mismos hechos: total
  `NoVerificable`, no se presenta un total solo-detalle sin evidencia y no se elige
  detalle por preferencia. Si existe vínculo de origen verificado o disyunción
  aprobada, el agregado se excluye y el detalle cuenta una vez; solo entonces puede
  verificarse el total.
- **F20 — corrección de versión.** Archivo v1 1.200,00; v2 1.150,00 con
  `reemplazaA=v1`, motivo y auditoría. Solo v2 contribuye; v1 se muestra como historia
  y no se suma: no 2.350,00. Si v1 y v2 aparecen como vigentes a la vez, total
  `NoVerificable`; no se elige una por orden de fila.
- **F21 — renombrado y reclasificación.** PAR100 «Comida» → «Alimentación» conserva
  ID/enlace y no crea versión. Un registro que pasa de PAR100 a PAR200 es
  reclasificación: nueva versión de mapping/archivo, motivo/auditoría y clasificación
  original preservada en la versión anterior; solo la vigente suma.
- **F22 — fecha ejecutada E2.4.** Archivo A con `fecha=null` y archivo B con
  `fecha=15/06/2026`; un Gasto detallado con `fecha=20/06/2026`. `fechaEjecutada` puede
  ser 20/06/2026 por el Gasto, pero el archivo A no aporta fecha ni se fecha por su
  intervalo/corte. Una fecha corregida solo cuenta si su versión es la vigente.
- **F23 — apertura de Deuda.** Fuente con apertura de Deuda D100. E4.5 no la enlaza ni
  la suma; muestra «No soportado por E4.5; ver E4.4». D100, capital y condiciones
  permanecen intactos; `aperturas=null` si no hay evidencia de apertura de Saldo.
- **F24 — cambio de jerarquía con el mismo PARxxx.** PAR100 pasa de SUB-A a SUB-B sin
  cambiar de ID. Se aplica E1.2: vista/impacto, motivo, confirmación, revisión/huella
  y protecciones; no se crea versión de catálogo. La consulta muestra la jerarquía
  vigente SUB-B y la procedencia original SUB-A; la historia no se reescribe. Sin
  impacto/motivo/confirmación, el cambio se bloquea o devuelve 409; no se resuelve por
  renombrado ni por una versión de catálogo inventada.

### Validación

- Ejercicio de cuatro dígitos; intervalo dentro del ejercicio; `inicio <= fin`; fechas
  civiles válidas; corte dentro del ejercicio y no futuro.
- Importes exactos en céntimos en el modelo; el DTO expone decimal exacto como string
  (`"50.00"`), sin float, redondeo ni overflow. `GastoHistorico` no negativo; apertura
  admite signo; regularización pendiente de Q5.
- `partidaId`/`referenciaId` deben existir si se informan; `null` es válido y separa.
  No se crean entidades desde la consulta.
- Mapping: destino existente, tipo correcto, una versión vigente por identidad; dos
  versiones incompatibles a la vez -> conflicto, no elección silenciosa.
- Origen: huella, hoja/tabla y fila/columna requeridas para un registro verificable;
  sin origen no hay total. Un `idOrigen` vacío no se sustituye por el nombre.
- Duplicados: misma identidad/huella -> uno; misma identidad/huella distinta ->
  conflicto; fuentes distintas -> ambigüedad.
- Cobertura: unión por días; un solo día de hueco impide el total; corte inclusivo;
  `31/12` necesario para total anual.
- Inactividad/renombrado: Partida/Referencia inactiva o renombrada sigue visible en
  historia; no se ofrece para nuevas selecciones; el ID no cambia.
- Regularización: solo 2026; sin inferencia por nombre; doble cómputo prohibido; sin
  extrapolación; sin campo de plan.
- Aperturas: no se escriben en Saldos/Deudas; no se suman a Gastos; ausencia no es 0.
- Transición: no crea filas; no copia planes; no reasigna años; no fotos.
- Concurrencia/restore: una consulta no muta datos; un restore conserva IDs/mapping/
  cobertura; una versión futura de esquema no se fija aquí.

## Security, persistence and compatibility

- **Acceso:** todas las rutas exigen sesión MFA; CSRF/Origin en cualquier mutación
  futura; E4.5 no tiene mutaciones. Sin bypass, sin token en navegador, sin recuperación
  alternativa.
- **Datos:** el archivo puede contener importes y notas privadas; no se publican en
  logs, artifacts, capturas ni PR. La procedencia se guarda sanitizada (huella, hoja,
  fila, ID de origen), no el documento completo. Los fixtures son ficticios.
- **Integridad:** lectura transaccional coherente; no se recalcula en el navegador; no
  se persiste un total ni una cobertura derivados; se persisten registros, intervalos de
  fuente, control y mapping, y la cobertura se recalcula al consultar; no se reescriben
  registros; no DELETE.
- **Persistencia:** si el desarrollo autorizado crea tablas, deberá ser migración
  versionada/atómica, STRICT/FK/WAL/busy_timeout, rollback y versión desconocida
  probados. Esta spec no fija DDL ni número de esquema.
- **Compatibilidad:** no cambia la matriz de cuatro Tipos, Movimientos, Saldos,
  Clasificación, Referencias, Deudas, Ciclos, Plan anual ni Nómina. No introduce un
  segundo ledger ni un motor de cierre.
- **Backup/restore:** el snapshot incluye registros, intervalos/fuentes, control y
  mapping; el manifiesto etiqueta la versión; restaurar conserva IDs y recalcula la
  cobertura desde esas fuentes, no desde un total persistido. E4.12 validará la
  equivalencia; E4.5 no la declara.
- **Límites:** sin Excel, bases reales, datos personales, VPS, deploy, importador
  definitivo, herramienta de carga, cambio de visibilidad ni merge.

## Consumer contracts

Estos contratos son mínimos y de solo lectura; no implementan E4.7/E4.11/E4.12.

### E4.7 — Resumen Anual y flujo completo trazable

- Consume el combinador E4.5; no reimplementa la suma archivo+detalle ni deduce
  cobertura por su cuenta.
- Recibe por ejercicio/Partida: `archivo`, `detalleControl`, `detallePrecontrol`,
  `total`, `subtotalConocido`, `estadoCobertura`, `estadoTotal`, `cobertura`, `corte`,
  `fuentes`, `procedencia`, `motivoCodigo`, `motivo` y `sinClasificar`.
- Solo puede presentar `total` como verificado si E4.5 devuelve cobertura completa
  hasta el corte; si no, muestra subtotal y motivo.
- No suma archivo al flujo de un Ciclo ni al plan mensual; el archivo es anual y la
  frontera de Ciclo es independiente.
- No duplica amortizaciones: el detalle ya excluye Amortización del total de Gastos;
  E4.5 no la vuelve a restar.
- Un cambio de año dentro de un Ciclo se resuelve por Fecha natural; no se copia el
  archivo de un año a otro.
- `fechaEjecutada` de E2.4 usa solo `fecha` conocida de la versión vigente y fechas de
  Gastos elegibles; un archivo sin fecha no aporta fecha ni se fecha por intervalo,
  corte o reloj. La corrección de fecha solo cuenta si su versión es la vigente.
- Si E4.7 necesita Ingresos históricos y Q2 no los aprueba, debe mostrar esa fuente como
  no disponible, no inventarla. E4.5 solo aporta el archivo anual de Gastos; E4.7 sigue
  integrando Neto compartido, Comida, inversiones y las demás fuentes temporales en sus
  propios motores. P6 se mantiene: inversión fuera de Movimientos y Comida auxiliar sin
  duplicar Gasto.

### E4.11 — Fotografías de ciclo/trimestre/año

- `Archivo` y `Foto` son discriminantes distintos: `tipoRegistro=Archivo` nunca se
  presenta como `tipoRegistro=Foto`.
- E4.11 no crea fotos a partir de archivo, no reetiqueta archivo como cierre y no
  recalcula una foto desde el archivo. `Foto` es una instantánea persistida de ciclo/
  trimestre/año; `Cierre financiero` es el evento manual de E4.9/E4.10. Una foto no es
  necesariamente un cierre y E4.5 no crea ninguno de los dos.
- Una foto conserva valores persistidos; un archivo conserva su origen y cobertura.
  La consulta puede mostrar ambos, pero no los fusiona.
- La versión/corte/origen de cada uno son visibles e inmutables.

### E4.12 — Ensayo integral de recuperación

- Restaurar una copia ficticia conserva `idArchivo`, `idMapeo`, `idOrigen`,
  `documentoHash`, `version`, intervalos/fuentes, control y regularización 2026;
  recalcula la cobertura desde esas fuentes.
- No se reasigna mapping por nombre ni se reutilizan IDs; no existe un total persistido
  que se pueda recalcular: el total verificado se reconstruye con el combinador.
- La matriz v5.11 aporta valores esperados independientes; E4.5 no certifica
  equivalencia real.
- El listado de discrepancias/brechas debe indicar qué archivo, mapping, intervalo o
  regularización falta para P7.

## Exclusions

- No desarrollo, código, SQL operativo, migración real, versión de esquema, base de
  datos, Excel, datos personales, VPS, infraestructura, B3, harness, deploy ni merge.
- No importador real, herramienta definitiva de carga, UI de mapping, carga de Excel ni
  modificación del libro estable.
- No reconstrucción de Movimientos, amortizaciones de Deuda, cuotas, intereses,
  posiciones de inversión, planes pasados ni fotos.
- No creación de aperturas, Saldos, Deudas, Partidas, Referencias, Ciclos, planes o
  Movimientos desde el archivo.
- No universalización de la regularización 2026 ni motor genérico de regularizaciones.
- No conversión de archivo en fotografía/cierre ni de foto en archivo.
- No suma de Ingresos/Transferencias/Amortización en el total de Gastos.
- No cálculo de totales con huecos, solapamientos, duplicados ambiguos o mapping
  pendiente.
- No nuevas dependencias, ORM, servicios externos, autenticación alternativa ni
  exposición remota.

## Acceptance checks

Clase **I** = criterio de implementación futura; **C** = contrato de consumo/
compatibilidad. Los sufijos `(Q5)` y `(Q7)` indican criterios condicionados a esas
decisiones; `(E4.x)` indica contrato de consumidor. Todos son **PREVISTOS/NO
EJECUTADOS**; una prueba diseñada no es PASS. Los IDs `AC-01…AC-45` son
`E4.5-AC-01…E4.5-AC-45`. La correspondencia con el roadmap es:
E4.5-AC1 → AC-02/05/06/12/13/14/15/31/40/41/45; E4.5-AC2 →
AC-16/17/18/24/34/37/39/42/43/44; E4.5-AC3 → AC-20/21/22.

| ID | Clase | Acción / precondiciones | Resultado esperado |
| --- | --- | --- | --- |
| AC-01 | C (E4.11) | Consultar un ejercicio con archivo, detalle y una foto ficticia | La UI/API distingue `Archivo`, `Detalle` y `Foto`; ninguno se etiqueta como otro; la foto no se recalcula desde archivo |
| AC-02 | I | Cargar fixture con `idOrigen`, huella y procedencia; recargar y restaurar | `idArchivo` estable, único e inmutable; `idOrigen`/huella/procedencia conservados; no se reutiliza un ID |
| AC-03 | I | Renombrar PAR100 y REF100 usados por archivo; consultar | Mismo ID/enlace; nombre vigente en consulta; nombre original en procedencia; mapping y total no cambian |
| AC-04 | I | Fila con solo nombre y dos Partidas homónimas | Mapping `Ambigua`/`Pendiente`; no asignación automática; fila en «Sin clasificar»; total global `NoVerificable` |
| AC-05 | I | Archivo 01/01–27/08 1.200,00 y detalle 28/08–31/12 300,00; control 28/08; corte 31/12 con reloj de prueba posterior | Total 1.500,00 una vez; componentes 1.200,00/300,00; cobertura completa; sin doble cómputo |
| AC-06 | I | Archivo 01/01–27/08 1.200,00; `controlDetalle.inicio=27/08`; detalle 27/08–31/12 320,00 (20,00 el 27/08 + 300,00 después); DTO F2 separado del DTO global | Solapamiento el 27/08 no separable; no se elige fuente ni se prorratea; total y subtotal `null`; archivo 1.200 y detalle 320 visibles; el 20,00 aparece en `conflictos[]`; `estadoCobertura=Solapada`, `estadoTotal=NoVerificable`; no 1.500 ni 1.520 como total/subtotal |
| AC-07 | I | Archivo hasta 30/06 y detalle desde 01/08 | Hueco 01/07–31/07 visible; cobertura `Parcial`; total `null`; subtotal conocido; no 0 |
| AC-08 | I | Consultar corte 27/08 y 28/08 con archivo/detalle contiguos | 27/08 solo archivo, cobertura hasta 27/08, sin total anual; 28/08 incorpora detalle una vez; frontera inclusiva |
| AC-09 | I | Cobertura completa 01/01–31/12 con fuente/intervalo verificado y sin filas | Total 0,00 verificado; texto «sin hechos en intervalo cubierto»; no «No disponible» |
| AC-10 | I | Sin archivo y control detallado desde 01/09; consulta anual | Total `null`; motivo «cobertura anterior no verificada»; no 0 |
| AC-11 | I | Registro explícito 0,00 verificado y ausencia en cobertura completa | El registro 0,00 se muestra como informado; la ausencia se muestra como «sin hechos»; ambos suman 0 sin confundirse |
| AC-12 | I | Dos filas idénticas de la misma fuente/identidad/huella | Un solo registro; total una vez; aviso de duplicado absorbido |
| AC-13 | I | Dos fuentes distintas con mismo intervalo/Partida, aunque el importe difiera | Dos candidatos ambiguos; no se suman ni se elige por importe; total no verificable; motivo visible |
| AC-14 | I | Archivo vinculado a Movimiento 123 dentro del control y a Movimiento 124 anterior al control; ambos también presentes en detalle | Se excluye el archivo por `representadoEnMovimientos=Si`; 123 ya está en `detalleControl` y no se suma otra vez; 124 entra una vez como `detallePrecontrolVinculado`; no doble |
| AC-15 | I | Abrir «Ver cobertura y procedencia» de un registro | Huella, hoja/tabla, fila/columna, ID de origen, fecha de extracción y versión de mapping visibles; sin documento/datos personales |
| AC-16 | I (Q7) | Consultar archivo con apertura histórica ficticia de Saldo; comparar Saldo/Deuda antes/después | Aperturas vigentes idénticas; no se crea Movimiento/Saldo/Deuda; archivo se muestra separado; `aperturas=null` si no hay evidencia |
| AC-17 | I (Q7) | Intentar que la apertura histórica engrose el total de Gastos o el Saldo actual | No se suma al ejecutado; no se escribe en Saldos/Deudas; `0,00` solo si consta apertura cero; ausencia no se convierte en 0 |
| AC-18 | I | Consultar 2027 tras 2026 con archivo/detalle | 2027 sin archivo/plan/Movimiento/foto/apertura heredados; `NoDisponible`; 2026 sigue consultable |
| AC-19 | I | Ciclo con hechos en diciembre 2026 y enero 2027 | Cada importe se asigna a su año natural; no se copia ni se reasigna por Ciclo; totales separados |
| AC-20 | I (Q5) | Registro `Regularizacion2026` 50,00 en 2026; consultar 2025/2026/2027 | Solo aparece en 2026; 2025/2027 no cambian; no se crea regla general |
| AC-21 | I (Q5) | Fila llamada «Regularización» sin tipo/mapping aprobado | No se infiere; queda `Pendiente`/no verificable; no se suma; no se aplica por nombre |
| AC-22 | I (Q5) | Regularización representada por identidad/origen en archivo o Movimiento; y regularización embebida en agregado sin registro separable | Se excluye una vez el registro vinculado; si está embebida y no se puede separar, no se resta y el total queda `NoVerificable` |
| AC-23 | C (E4.11) | Consultar E4.11 después de consultar archivo | No se crea foto ni cierre; `tipoRegistro=Archivo` permanece distinto; no se convierte en plan/foto |
| AC-24 | I | Ejercicio sin archivo, sin control detallado y sin hechos | Estado vacío explicativo; no se crean plan/Movimiento/foto/total 0 |
| AC-25 | I | Enviar POST/PATCH/DELETE a rutas de histórico | 405/422; no hay endpoint de escritura/importación; datos existentes intactos |
| AC-26 | I | GET sin sesión y GET autenticado con datos ficticios | 401 sin sesión; autenticado no-store; importes no aparecen en logs/artifacts; sin SQL/stack público |
| AC-27 | I | Provocar carga, vacío, parcial, ambiguo y error de red | Estados diferenciados; no se sustituye por 0/demo; reintento conserva filtros; foco en aviso |
| AC-28 | I | Revisar 390 y 1440 con los wireframes | Tabla/tarjetas equivalentes, sin scroll horizontal; etiquetas/foco/teclado; estado no solo color; importes tabulares |
| AC-29 | C (E4.7) | E4.7 consume el contrato con archivo+detalle y con hueco | Total solo si cobertura completa; si no, subtotal+motivo; no duplica amortización ni contamina Ciclo; Neto compartido/inversión/Comida siguen en sus motores |
| AC-30 | C (E4.12) | E4.12 restaura fixture y compara con matriz esperada | IDs, mapping, intervalos/fuentes y regularización preservados; cobertura recalculada; fotos intactas; discrepancias listadas |
| AC-31 | I | Cambiar mapping a nueva versión y consultar registros antiguos | Registros conservan versión usada; nueva versión no reescribe; destino por ID; auditoría/fecha visibles |
| AC-32 | I | Corte fuera del ejercicio/futuro; fila no verificada/sin mapping | 422 por corte inválido/futuro; fila no verificada/sin mapping queda fuera del total con motivo; no 0 ni asignación automática |
| AC-33 | I | Detalle con Ingreso, Transferencia, Amortización y un Gasto | Solo el Gasto entra en el total de Gastos; los demás no se suman ni se convierten |
| AC-34 | I | Gasto precontrol vinculado a archivo, Gasto vinculado dentro del control y Gasto precontrol sin vínculo | Vinculado precontrol cuenta una vez como `detallePrecontrolVinculado`; vinculado dentro del control ya está en `detalleControl` y no se duplica; no vinculado se muestra aparte y deja total `NoVerificable` |
| AC-35 | I | Archivo agregado anual 1.200,00 y detalle parcial de septiembre 100,00, sin desglose separable | No se resta 100,00 del archivo; se muestran ambos; total `NoVerificable`; no 1.100,00 |
| AC-36 | I | Archivo de septiembre y Gasto de septiembre con `representadoEnMovimientos=Desconocido` | Solapamiento no resoluble; total `NoVerificable`; no se excluye ni incluye automáticamente |
| AC-37 | I (Q7) | Archivo solo con `AperturaHistorica` que cubre el año; sin fuente/control de Gastos | Cobertura de Gastos `NoDisponible`; no 0,00 de Gastos; apertura se muestra aparte; ausencia de evidencia no es apertura cero |
| AC-38 | I | SRC-1 alcance PAR100 control desde 28/08; SRC-2 alcance PAR205 control desde 01/08; Gasto PAR100 del 15/08; solapamiento parcial entre fuentes | Cada fuente conserva su corte/control y solo cubre su alcance; el Gasto PAR100 del 15/08 no se considera control por SRC-2 y deja total `NoVerificable` si no hay vínculo; solapamiento deja `Solapada`; una fuente no completa la otra |
| AC-39 | I | Archivo agregado 01/01–27/08 1.200,00 sin desglose; consulta a 30/06 | No se prorratea ni se recorta; total y subtotal `null`; `estadoCobertura=Completa` (cobertura temporal), `estadoTotal=NoVerificable`, `motivoCodigo=AgregadoNoAtribuibleAlCorte`; no se presenta 1.200,00 como ejecutado hasta 30/06 |
| AC-40 | I | Archivo v1 1.200,00 sustituido por v2 1.150,00 con `reemplazaA`; consultar el ejercicio | Solo v2 contribuye; v1 visible como historia; total una vez; no se suman 2.350,00; cadena bifurcada deja `NoVerificable` |
| AC-41 | I | Renombrar PAR100 y REF100; después reclasificar un registro de PAR100 a PAR200 con nueva versión de mapping/archivo | Renombrado conserva ID/enlace y no crea versión; reclasificación crea versión nueva, conserva la clasificación original y solo la vigente suma; no se mezclan ambas |
| AC-42 | C (E2.4) | Archivo con `fecha=null`, archivo con fecha conocida y Gasto detallado; consultar `fechaEjecutada` de E2.4 | Solo fechas conocidas de versiones vigentes/Gastos; `null` no se sustituye por intervalo, corte ni reloj; una fecha corregida solo cuenta si su versión es vigente |
| AC-43 | I (Q7) | Fuente con apertura de Deuda Dxxx; consultar archivo y Deuda | No se enlaza ni se suma; se muestra «No soportado por E4.5; ver E4.4»; Dxxx, capital y condiciones intactos; `aperturas=null` si no hay evidencia de Saldo |
| AC-44 | I | Agregado 01/01–27/08 y detalle que cubre 01/01–30/06, sin vínculo `representadoEnMovimientos=Si` ni separación/disyunción aprobada | No se prioriza detalle automáticamente; total `NoVerificable`; no total solo-detalle; Q10 abierta. Con vínculo/disyunción aprobada, agregado excluido y detalle una vez |
| AC-45 | I | Mover PAR100 de SUB-A a SUB-B sin cambiar ID; consultar archivo e historia | E1.2 aplicado: impacto, motivo, confirmación, revisión/huella y protecciones; jerarquía vigente SUB-B y procedencia original SUB-A visibles; sin versión de catálogo ni reescritura; sin impacto/motivo/confirmación -> bloqueo/409 |
