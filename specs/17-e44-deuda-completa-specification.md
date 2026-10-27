# 17 — E4.4 Deuda completa y conciliación desde apertura: Specification

Status: **APPROVED (documental) — 2026-10-27.** Specification 17 y wireframes de la
revisión `1d539a8` aprobados por el usuario a través del chat supervisor Codex («Las
apruebo»). La autorización de desarrollo **DEV17-E44** es separada («Pasamos al
desarrollo»); no autoriza merge ni despliegue. Este registro de estado no cambia el
contenido funcional aprobado.

Approval source/date: usuario, 2026-10-27, mensaje «Las apruebo» en respuesta única a la
aprobación de specification 17 y wireframes de la revisión
`1d539a8cb9c38b3a8d2e3921a3651197105ce282`. La autorización de desarrollo se registra por
separado en [progress17](17-e44-deuda-completa-progress.md).

Context and brainstorming: [17-e44-deuda-completa-brainstorming.md](17-e44-deuda-completa-brainstorming.md),
[E4.4](roadmap.md#e44--deuda-completa-y-conciliación-desde-apertura),
[E1.6](06-deuda-specification.md), [R2/R5/P4–P7](functional-reference-v5.11.md),
[spec04](04-movimientos-specification.md), [spec05](05-transferencias-referencias-specification.md),
[spec07](07-ciclos-operacion-specification.md).

Base de preparación: `origin/main` = `1d539a8cb9c38b3a8d2e3921a3651197105ce282`;
esquema SQLite v16. Esta spec **no fija** una versión futura de esquema ni escribe SQL.
El desarrollo comprobará de nuevo `main`, la versión vigente y los contratos integrados
antes de implementar.

## Functionality

E4.4 amplía la Deuda mínima de E1.6 para **conservar sus condiciones e historia**, mostrar
la **historia ejecutada**, el **capital de control** y la **deuda viva**, y permitir una
**conciliación desde apertura** contra un saldo declarado opcional. No remodela Saldos ni
Movimientos, no crea un segundo ledger y **no representa la Deuda como Saldo**.

Capacidades incluidas:

1. Conservar Inicio control, capital de apertura, TIN, TAE, cuota contractual y condiciones
   informativas, además del tipo de Deuda (Hipotecaria / No hipotecaria / Sin informar).
2. Mostrar la historia ejecutada de cuotas y amortizaciones extraordinarias ya registradas
   en Movimientos, separando capital, intereses, gasto y efecto bancario.
3. Mostrar el histórico/precontrol de solo lectura sin volver a descontarlo del capital.
4. Calcular la deuda viva por la fórmula E1.6 sobre **todos los hechos registrados** o a un
   corte histórico inclusivo, sin persistir el resultado ni usar el reloj como fuente.
5. Conciliar el capital derivado con un saldo declarado opcional (importe, fecha y
   fuente/nota), mostrando la diferencia exacta sin fabricar transacciones.
6. Distinguir deuda no hipotecaria e hipoteca sin activo inmobiliario controlado, sin
   convertir ninguna de ellas en Saldo.
7. Exponer un contrato de lectura para E4.6/E4.7 y conservar las garantías de E1.6.

### Autoridad, alcance y frontera

| Contrato | Autoridad | E4.4 |
| --- | --- | --- |
| Dxxx, nombre, Inicio control, apertura, estado, revisión | E1.6, aprobado e implementado | Consume; no cambia identidad ni fórmula |
| Capital actual = apertura − capital desde Inicio control | E1.6/R5, fórmula física Q1 | Consume; añade vista por corte y explicación de cobertura |
| Cuota = Gasto íntegro; capital + intereses = importe | E1.6/R2 | Consume; muestra el desglose en la historia |
| Extraordinaria = Amortización deuda; capital = importe; sin Gasto | E1.6/R2 | Consume; muestra el desglose en la historia |
| Precontrol no reduce otra vez el principal | E1.6/R5/P6 | Consume; conserva y muestra el histórico sin usarlo como operando |
| Deudas no son Saldos | R2/R5 | Reafirma; prohíbe agregados que las sumen como Saldo |
| Condiciones completas, TIN/TAE/cuota, hipoteca y conciliación | E4.4 | **Delta propio** de esta spec |
| Archivo histórico precontrol, fotos, cierre, resumen E4.6/E4.7 | E4.5/E4.11/E4.8–E4.10/E4.6/E4.7 | Fuera de E4.4; solo contratos de lectura cuando proceda |

E4.4 no declara implementados los `E1.6-AC-31…E1.6-AC-33` ni los consumidores E2/E3/E4.6/E4.7.
No crea tipos de Movimiento, no habilita Transferencias con Exterior, no importa el Excel y
no sustituye la fuente de verdad vigente.

La lectura E4.4 **no convierte un desglose ausente en cero**: si un hecho aplicable no tiene
capital/intereses válidos, la deuda viva es no calculable y se indica el hecho afectado.
E4.4 no reabre la fórmula Q1 ni los contratos de escritura de E1.6, pero sí define un **read
model propio** (o un ajuste de lectura mínimo y documentado) que aplica la misma fórmula con
validación de desglose completo. Si se reutiliza el lector E1.6, se corregirá únicamente su
presentación `null → 0`, con prueba de regresión; no se cambia el cálculo ni se reescribe la
historia.

### Dependencias DT2/DT7/DT8

- **DT2 (precisión/IDs/constraints):** esta spec propone EUR exacto, tasas decimales sin
  `float`, fechas civiles y transacciones atómicas; no fija SQL, nombres físicos ni número de
  migración. La propuesta se contrastará con `main` y con la fuente antes de dev.
- **DT7 (mapping/aperturas/precontrol/conciliación):** se conservan los conceptos R5, pero
  no se aprueba el mapping real, el corte de 2026 ni una importación. E4.4 no incorpora el
  Excel ni datos personales; el mapping y la equivalencia siguen siendo gates de E4.5/E4.12.
- **DT8 (UX/wireframes):** los wireframes 1440/390 de esta spec son una propuesta, no una
  aprobación visual ni una prueba de accesibilidad. Su revisión y la de los estados
  vacío/parcial/error quedan pendientes.


### Definiciones verificables

| Término | Definición | Fuente única | No es |
| --- | --- | --- | --- |
| Capital de apertura | Importe EUR exacto de la Deuda en la frontera | `Deuda.capitalApertura` | Un Movimiento, Saldo o cálculo |
| Inicio control | Fecha civil de la frontera inclusiva | `Deuda.inicioControl` | Fecha de inicio del préstamo ni fecha de corte de consulta |
| Capital de control | El capital de apertura en la frontera; se muestra con esa etiqueta | `Deuda.capitalApertura` | Un segundo saldo declarado |
| Capital aplicado | Suma de `capital` de cuotas y extraordinarias vigentes del mismo Dxxx, con Fecha `>=` Inicio control y `<=` corte si existe | Movimientos + enlace Partida→Deuda | Cuota completa, intereses, comisiones o histórico precontrol |
| Deuda viva | `capital de apertura − capital aplicado`, si el cálculo es verificable | Derivada; no se persiste | Capital + intereses futuros; saldo bancario; patrimonio |
| Historia ejecutada | Cuotas y extraordinarias vinculadas, incluidas precontrol y anuladas, con banderas de aplicación | Movimientos + Partida→Deuda | Un segundo registro de pagos |
| Precontrol | Hechos anteriores a Inicio control y campos históricos R5 anteriores a la frontera | Movimientos + campos históricos | Operando adicional del capital actual |
| Corte histórico | Fecha civil inclusiva de consulta; solo hechos registrados hasta esa fecha | Parámetro de consulta | Fotografía persistida ni reconstrucción de hechos ausentes |
| Vista sin corte | Todos los hechos registrados, sin filtrar por el reloj | Movimientos vigentes | “Hoy” como fuente financiera |
| Saldo declarado | Importe externo opcional con fecha y fuente/nota, para comparar | Registro de conciliación | Hecho económico, Movimiento o ajuste de capital |
| Discrepancia | Diferencia o inconsistencia visible que requiere revisión | Derivada | Algo que se corrige truncando, compensando u ocultando |
| Condiciones informativas | TIN, TAE, cuota contractual y texto de condiciones | Campos de la Deuda | Motor de intereses, cuadro de amortización o previsión |
| Tipo de Deuda | Hipotecaria / No hipotecaria / Sin informar | Campo de la Deuda | Activo inmobiliario, LTV, garantía o Saldo |

### Fuente única por dato

| Dato | Fuente única | Derivado / no persistido |
| --- | --- | --- |
| Capital de apertura y capital de control | `Deuda.capitalApertura` + `Deuda.inicioControl` | No |
| Capital aplicado | Movimientos vigentes con capital y enlace Partida→Dxxx | Sí |
| Deuda viva | Apertura − capital aplicado | Sí |
| Intereses de una cuota | `Movimientos.intereses` del mismo hecho | No (dato del hecho) |
| Gasto de una cuota | `Movimientos.importe` íntegro | No (dato del hecho) |
| Gasto de una extraordinaria | Cero por contrato E1.6 | Derivado |
| Efecto bancario | Motor de Saldos sobre el Saldo origen; importe del hecho | Sí; E4.4 no lo recalcula |
| Histórico/precontrol R5 | Campos históricos de la Deuda; solo lectura en E4.4 | No |
| Precontrol ejecutado | Movimientos anteriores a Inicio control | Sí; se muestran, no se suman al capital |
| Saldo declarado | Registro de conciliación (importe, fecha, fuente) | No |
| Diferencia de conciliación | Declarado − deuda viva en la fecha de corte | Sí |
| Fecha de corte | Parámetro de consulta civil | No se persiste como foto |
| TIN/TAE/cuota/condiciones | Campos informativos de la Deuda | No calculan |
| Tipo de Deuda | Campo de la Deuda | No se infiere |

### Separación de principal, intereses, comisiones y efecto bancario

| Concepto | Dónde vive | Efecto | Límite |
| --- | --- | --- | --- |
| Principal | `capital` de la cuota o extraordinaria | Reduce deuda viva si Fecha `>=` Inicio control | No se descuenta la cuota completa |
| Intereses | `intereses` de la cuota | No reduce principal; forma parte del Gasto de la cuota | No se calcula por TIN/TAE |
| Comisiones/penalizaciones | No soportadas en E1.6/E4.4 | No se inventan ni se agrupan en intereses | Requieren spec y aprobación financiera futuras |
| Efecto bancario | Saldo origen y motor de Saldos | Salida por el importe del hecho | E4.4 lo muestra, no lo recalcula ni lo persiste |
| Gasto económico | Movimiento de cuota | Gasto íntegro por el importe | Extraordinaria no es Gasto |
| Ejecución presupuestaria | Consumidor E2.3/E4.7 | Cuota consume Gasto completo; extraordinaria no | E4.4 no ejecuta presupuesto |


### Reglas funcionales

**R-E44-1 — Una sola fuente de capital.** La deuda viva se calcula con la fórmula E1.6:
`apertura − Σ capital` de Movimientos vigentes del mismo Dxxx con Fecha `>=` Inicio control.
No se descuentan intereses, cuota completa, comisiones, histórico/precontrol ni un saldo
declarado. El resultado es derivado y no se persiste.

**R-E44-2 — Precontrol no se descuenta dos veces.** Los hechos anteriores a Inicio control
conservan su efecto bancario y su Gasto real, pero no reducen el principal de apertura. Los
campos históricos R5 son informativos: no se suman ni restan al capital actual y no se
reconstruyen hechos ausentes. Una apertura ausente no es cero; un histórico ausente no es
cero.

**R-E44-3 — Historia ejecutada, no ledger paralelo.** La historia se compone de los
Movimientos ya existentes vinculados por Partida→Deuda. Cada fila conserva su ID, fecha,
tipo, importe, capital, intereses, Referencia, estado y efecto bancario según el motor de
Saldos. No se crea un segundo registro de pagos ni se copian importes a una tabla de historia.

**R-E44-4 — Condiciones informativas.** TIN, TAE, cuota contractual y condiciones se
conservan y se muestran, pero no calculan intereses, cuotas, amortizaciones, fechas ni
cuadros. La cuota contractual es una referencia, no un hecho ejecutado; no se autocompleta
desde el histórico ni se infiere por TIN/TAE. Una condición desconocida se muestra como
`Sin informar`, nunca como cero.

**R-E44-5 — Tipo de Deuda explícito.** `Hipotecaria`, `No hipotecaria` o `null`
(presentado como `Sin informar`). No se infiere del nombre, Partida, importe, acreedor ni
condiciones. Las Deudas existentes quedan con `null`/`Sin informar` hasta que el usuario las
clasifique. No se modela activo inmobiliario, valor de garantía, LTV ni amortización
hipotecaria simulada.

**R-E44-6 — Conciliación sin fabricar hechos.** Un saldo declarado opcional se compara con
la deuda viva en su fecha de corte. La diferencia es exacta y visible; no se trunca, no se
compensa y no genera un Movimiento, Gasto, Transferencia ni amortización de ajuste. Se
resuelve corrigiendo los hechos que correspondan (E1.6) o corrigiendo/anulando el declarado
con motivo y auditoría. No existe un estado “resuelto” que oculte una diferencia.

**R-E44-7 — Corte histórico inclusivo y limitado.** La consulta por corte usa la fecha
civil `<= corte` y solo hechos registrados. El día del corte se incluye. No usa el reloj
para calcular el capital. Antes de Inicio control no hay deuda viva derivada; se muestra
cobertura precontrol y el motivo. Si el corte es anterior a un hecho precontrol concreto,
ese hecho no se incluye; el agregado R5 se muestra como agregado y no se descompone por
fecha. Una fecha futura se rechaza para no confundir histórico con previsión.

**R-E44-8 — El corte no es una fotografía.** Rectificar o anular un Movimiento después de
una consulta puede cambiar el resultado del mismo corte, porque se recalcula desde los
hechos vigentes. No se reconstruye el estado pasado desde la auditoría ni se crea una foto;
E4.11 seguirá siendo la entrega de fotografías inmutables.

**R-E44-9 — Deuda no es Saldo.** Ningún endpoint, agregado o pantalla suma Deuda a Saldos,
Liquidez, patrimonio o bolsas. La deuda no genera un Saldo negativo, un Movimiento de
apertura ni una Transferencia. Los consumidores futuros reciben el capital y el tipo por
separado y deciden su presentación sin convertirlo en Saldo.

**R-E44-10 — Integridad, revisión y auditoría.** Altas/ediciones de Deuda y conciliaciones
exigen revisión, validación servidor, transacción atómica e idempotencia cuando crean. Los
cambios se auditan con actor, UTC, anterior/posterior y motivo cuando corresponda. No hay
DELETE. Los campos derivados enviados por el cliente se rechazan. Las protecciones de
apertura/Inicio/enlaces usados de E1.6 se conservan.

### Ciclo de cambio y efecto en consultas

| Cambio | Control | Efecto en capital | Efecto en historia/conciliación | Auditoría |
| --- | --- | --- | --- | --- |
| Nombre/estado de Deuda | PATCH con revisión; E1.6 | Ninguno | Se conserva; no crea hechos | Sí, actor/UTC/anterior/posterior |
| Tipo/condiciones | PATCH con revisión; motivo si se corrige un valor existente | Ninguno | Se muestra el nuevo dato; no recalcula capital | Sí, con motivo |
| Histórico/precontrol R5 | **Solo lectura en E4.4**; no POST/PATCH; origen futuro en importación/migración o corrección autorizada fuera de E4.4 | Ninguno | Se muestra el dato existente; no se corrige ni reconstruye desde E4.4 | No hay escritura E4.4; la vía futura deberá auditar |
| Aportar/corregir histórico | **No autorizado en E4.4**; requiere proceso futuro aprobado (E4.5/E4.12/DT7) | Ninguno | Solo cambia el dato histórico si se autoriza esa vía | La vía futura deberá registrar actor/motivo/fuente |
| Apertura/Inicio usados | Bloqueo E1.6 | No se editan | Se conserva la historia | Intento rechazado, sin escritura |
| Alta/corrección/anulación de conciliación | POST/PATCH con idempotencia y revisión | Ninguno | Diferencia recalculada; anulada conservada | Sí, con motivo al corregir/anular |
| Rectificar pago | Pipeline E1.6 con revisión/contexto | Recalcula; sustituye el efecto anterior | Historia y diferencia recalculadas; ambas Deudas | Auditoría E1.6 |
| Anular pago | E1.6; sin DELETE | Excluye el efecto; recalcula | Historia conservada como anulada | Auditoría E1.6 |
| Cambiar fecha respecto al corte | Misma operación E1.6 | El corte puede incluir/excluir el hecho | El resultado del corte cambia; no hay foto | Auditoría E1.6 |

## Data model and contracts

Modelo **conceptual**; no es esquema SQL aprobado, no fija nombres físicos ni número de
migración. La implementación futura comprobará `main`, la versión vigente y las constraints
existentes.

### Entidades

| Entidad | Persistente propuesto | Derivado / no persistir |
| --- | --- | --- |
| Deuda | Campos E1.6 + tipo, TIN, TAE, cuota contractual, condiciones, histórico/precontrol (solo lectura en E4.4), revisión y UTC | Capital aplicado, deuda viva, cobertura, diferencias, historia ejecutada |
| Conciliación de Deuda | ID técnico estable, Deuda, fecha de corte, capital declarado, fuente/nota, estado, revisión y UTC | Diferencia, estado conciliado/no comparable |
| Partida existente | Enlace 0..1 a Deuda, ya existente | Deuda/nombre por descripción |
| Movimiento existente | Hecho único, Tipo, fecha, importe, capital, intereses, Partida, REF, estado y auditoría | Historia, capital y efectos derivados |
| Auditoría / intento | Actor único, motivo, UTC, anterior/posterior, revisiones e idempotencia | No acumulados financieros paralelos |

### Campos de Deuda

| Campo | Tipo / dominio | Nulo | Papel | Operando del capital |
| --- | --- | --- | --- | --- |
| `id` | Dxxx estable, generado en servidor | No | Identidad visible | No (clave de relación) |
| `nombre` | Texto 1..120, sin controles | No | Identidad visible | No |
| `inicioControl` | Fecha civil ISO | Sí en legado | Frontera inclusiva | Sí (frontera) |
| `capitalApertura` | EUR exacto | Sí en legado | Posición en la frontera | Sí (base) |
| `estado` | Activa / Inactiva | No | Ciclo de vida | No |
| `revision` | Entero > 0 | No | Concurrencia | No |
| `tipoDeuda` | `Hipotecaria` / `No hipotecaria` / `NULL` (= Sin informar); no se persiste el literal `Sin informar` | Sí | Clasificación | No |
| `tin` | Porcentaje decimal exacto, informativo; se conserva el signo aportado y se aplica un límite técnico de magnitud propuesto 100 | Sí | Condición | No |
| `tae` | Porcentaje decimal exacto, informativo; mismo criterio | Sí | Condición | No |
| `cuotaContractual` | EUR exacto, informativo | Sí | Condición | No |
| `condiciones` | Texto informativo acotado (propuesta 1.000 caracteres) | Sí | Condición libre | No |
| `capitalInicial` | EUR exacto | Sí | Histórico R5; solo lectura E4.4 | No |
| `capitalAmortizadoHistorico` | EUR exacto | Sí | Histórico R5; solo lectura E4.4 | No |
| `amortizacionExtraHistorica` | EUR exacto | Sí | Histórico R5; solo lectura E4.4 | No |
| `capitalHistoricoCuotas` | EUR exacto | Sí | Histórico R5; solo lectura E4.4 | No |
| `interesesHistoricos` | EUR exacto | Sí | Histórico R5; solo lectura E4.4 | No |
| `totalPagadoHistorico` | EUR exacto | Sí | Histórico R5; solo lectura E4.4 | No |
| `precontrolCuotas` | Conteo entero `>= 0` | Sí | Precontrol R5; solo lectura E4.4 | No |
| `precontrolCapital` | EUR exacto | Sí | Precontrol R5; solo lectura E4.4 | No |
| `precontrolAmortizacionExtra` | EUR exacto | Sí | Precontrol R5; solo lectura E4.4 | No |
| `precontrolEjercicio` | Año civil, etiqueta | Sí | Contexto del precontrol; solo lectura E4.4 | No |

Los campos nuevos son opcionales y **nullable**. No se rellenan con cero, no se derivan de
la apertura y no se backfillean en Deudas existentes. Si la fuente presenta el precontrol
como un único agregado, se conserva el agregado con su etiqueta y no se descompone por
inferencia; los campos separados solo se usan cuando la fuente los aporta.

**Solo lectura en E4.4.** Los campos históricos/precontrol **no se aceptan** en `POST` ni
`PATCH` de esta entrega. El usuario único puede consultarlos, pero E4.4 no le concede una
acción de alta/corrección. Su aportación o corrección corresponde, fuera de E4.4 y bajo
autorización expresa del usuario único/propietario, a una **importación/migración o
corrección histórica futura** (E4.5/E4.12/DT7 o un proceso específico aprobado), con fuente,
motivo, actor y auditoría. E4.4 no autoriza esa vía ni inventa quién puede ejecutarla. Hasta
entonces, una ausencia se muestra como `Sin informar` y una inconsistencia como discrepancia;
no se rellena ni se reconstruye.

### Relaciones históricas de la fuente

La tabla R5 documenta relaciones que se usan solo como **comprobación informativa**, nunca
como operandos del capital actual:

- Si `capitalInicial`, `capitalApertura` y `capitalAmortizadoHistorico` están presentes:
  `capitalInicial − capitalApertura = capitalAmortizadoHistorico`.
- Si la fuente identifica el “capital histórico” y sus componentes, la relación
  `capital histórico − amortización extraordinaria histórica = capital histórico en cuotas`
  se muestra igualmente como comprobación, sin imponer una base que la fuente no aclare.
  Esta spec **no crea** un campo `capitalHistorico` ni presume que `capitalInicial` sea esa
  base; si la fuente no lo identifica, la relación no se calcula.
- Una diferencia se muestra como `histórico inconsistente`, con los campos y la diferencia
  exacta. No se corrige automáticamente, no se bloquea la lectura del dato existente y no se
  usa para alterar la deuda viva; E4.4 no ofrece la corrección.

### Conciliación de Deuda

| Campo | Tipo / dominio | Nulo | Papel |
| --- | --- | --- | --- |
| `id` | ID técnico estable, no reutilizado | No | Identidad de la conciliación |
| `deuda` | Dxxx existente | No | Relación |
| `fechaCorte` | Fecha civil ISO | No | Fecha de comparación |
| `capitalDeclarado` | EUR exacto | No | Saldo externo declarado |
| `fuente` | Texto acotado (propuesta 200) | Sí | Banco, Excel, otro |
| `nota` | Texto acotado (propuesta 1.000) | Sí | Evidencia/contexto |
| `estado` | Vigente / Anulada | No | Vigencia lógica |
| `revision` | Entero > 0 | No | Concurrencia |
| `creado` / `actualizado` | UTC ISO | No | Auditoría técnica |

Reglas de conciliación:

- Se permiten varias conciliaciones por Deuda, con fechas distintas; una sola vigente por
  Deuda y fecha. Un alta duplicada vigente responde 409; la corrección se hace sobre la
  existente con `PATCH` y revisión, sin crear una segunda.
- La vista de listado muestra la conciliación vigente de **mayor `fechaCorte`** y, si hay
  más de una, indica `Varias` con acceso a la ficha; la ficha muestra todas. No se elige una
  conciliación por revisión sin fecha ni se oculta una diferencia de otra fecha.
- `fechaCorte` es una fecha civil no futura (Europe/Madrid); una fecha futura se rechaza con
  422 para no confundir conciliación histórica con previsión.
- La diferencia es `capitalDeclarado − deuda viva` en `fechaCorte`, exacta y con signo.
- `Conciliado` si la diferencia es exactamente 0; `Diferencia` si no; `No comparable` si la
  deuda viva no es calculable, falta apertura/Inicio/desglose o el corte es anterior al
  Inicio control. No se inventa un cero para forzar una comparación.
- Corregir o anular exige revisión, motivo y auditoría. Anular conserva el registro y lo
  excluye de la vista vigente; no hay DELETE.
- Una conciliación no cambia la Deuda, el capital, el Gasto, el Saldo ni la Referencia.

### DTO conceptual de consulta

Los importes viajan como cadenas decimales exactas; las fechas como ISO civil. Ejemplo
ficticio, no contrato de transporte definitivo:

```json
{
  "id": "D001",
  "nombre": "Préstamo ficticio",
  "tipoDeuda": "No hipotecaria",
  "estado": "Activa",
  "revision": 3,
  "control": {
    "inicio": "2026-10-01",
    "capitalApertura": "1000.00",
    "capitalControl": "1000.00"
  },
  "condiciones": {
    "tin": "2.500000",
    "tae": "2.800000",
    "cuotaContractual": "100.00",
    "texto": "Condiciones ficticias informativas"
  },
  "historico": {
    "capitalInicial": "1200.00",
    "capitalAmortizadoHistorico": "200.00",
    "amortizacionExtraHistorica": "0.00",
    "capitalHistoricoCuotas": "1200.00",
    "interesesHistoricos": "300.00",
    "totalPagadoHistorico": "1500.00",
    "precontrol": {
      "ejercicio": 2026,
      "cuotas": 3,
      "capital": "50.00",
      "amortizacionExtra": "0.00"
    }
  },
  "corte": "2026-10-20",
  "cobertura": {
    "desdeControl": true,
    "hastaCorte": true,
    "incluyePrecontrol": true,
    "hechosAplicables": 2,
    "hechosExcluidosPorCorte": 0,
    "hechosAnulados": 0,
    "desgloseVerificable": true
  },
  "capital": {
    "aplicado": "280.00",
    "deudaViva": "720.00",
    "calculable": true,
    "motivoNoCalculable": null
  },
  "historia": [
    {
      "movimiento": "123",
      "fecha": "2026-09-30",
      "tipo": "Gasto",
      "total": "70.00",
      "capital": "50.00",
      "intereses": "20.00",
      "gasto": "70.00",
      "efectoBanco": "-70.00",
      "aplicaAlCapital": false,
      "estado": "Vigente"
    },
    {
      "movimiento": "124",
      "fecha": "2026-10-01",
      "tipo": "Gasto",
      "total": "100.00",
      "capital": "80.00",
      "intereses": "20.00",
      "gasto": "100.00",
      "efectoBanco": "-100.00",
      "aplicaAlCapital": true,
      "estado": "Vigente"
    },
    {
      "movimiento": "125",
      "fecha": "2026-10-15",
      "tipo": "Amortización deuda",
      "total": "200.00",
      "capital": "200.00",
      "intereses": "0.00",
      "gasto": "0.00",
      "efectoBanco": "-200.00",
      "aplicaAlCapital": true,
      "estado": "Vigente"
    }
  ],
  "conciliaciones": [
    {
      "id": "C001",
      "fechaCorte": "2026-10-20",
      "capitalDeclarado": "750.00",
      "fuente": "Banco ficticio",
      "diferencia": "30.00",
      "estadoConciliacion": "Diferencia",
      "estado": "Vigente",
      "revision": 1
    }
  ]
}
```

Los campos `capitalAplicado`, `deudaViva`, `diferencia`, `estadoConciliacion`,
`aplicaAlCapital`, `cobertura` y `gasto` son **derivados**: se rechazan si el cliente intenta
escribirlos. `precontrol.cuotas` es el agregado R5 aportado; no implica que la historia
ejecutada contenga ese número de filas ni se reconstruye desde Movimientos.

### Persistencia, precisión y compatibilidad

- EUR en céntimos enteros exactos, lectura/escritura como texto decimal; nunca `float` ni
  redondeo silencioso. Un tercer decimal o un importe no exacto se rechaza.
- TIN/TAE como decimal exacto, sin `float`; el máximo de decimales y el rango técnico se
  confirman con la fuente antes de dev. No se usan para cálculo. `condiciones` no se parsea.
- Fechas económicas civiles ISO; metadatos de auditoría en UTC. El corte no usa el reloj
  para calcular; solo se valida que no sea futuro.
- Migración futura versionada y atómica desde la versión vigente de `main` (hoy v16):
  preservar IDs, Deudas, Partidas, Movimientos, Ciclos, Referencias, auditoría, intentos,
  MFA, identidad demo/producción y pareja DB/clave. Campos nuevos nullable, sin backfill.
  Rollback ante fallo; versión desconocida intacta; dos arranques concurrentes sin corrupción.
- Backup/restore: el snapshot debe incluir los nuevos campos y conciliaciones; el manifiesto
  identifica la versión correcta; la restauración aislada conserva acceso/MFA y no publica
  datos. No se ejecuta migración operativa ni se crean bases reales en esta fase.
- No se fija un número de migración ni se escribe SQL. El dev deberá comprobar si `main`
  cambió y ajustar el delta sin reinterpretar las reglas financieras.

## Screens and interfaces

Wireframes **propuestos**, no implementados ni aprobados. Reutilizan el shell, la cabecera
de Ciclos, la navegación, los tokens y los componentes existentes; tema claro, sin modo
oscuro, sin librerías nuevas. No se diseña un dashboard de patrimonio ni un cuadro de
amortización.

### 1440 px — listado

```text
┌ MyFinanzas ┬ Ciclo financiado: [contexto del maestro / No disponible] ─────────────────┐
│ Saldos      │ Deudas                                                [+ Nueva deuda]      │
│ Clasific.   │ Buscar [____________________] Tipo [Todas ▾] Estado [Activas ▾]           │
│ Ciclos      │ ID    Nombre              Tipo             Inicio control Apertura Deuda viva Conciliación │
│ Movim.      │ D001  Préstamo ficticio   No hipotecaria  01/10/2026     1.000,00 720,00    +30,00 · Varias │
│ Referenc.   │ D002  Hipoteca ficticia   Hipotecaria     [Sin informar]  [—]      [—]       Sin declarar │
│ Deudas      │ D003  Deuda sin tipo      Sin informar     ...            ...      ...       No calculable │
│             │ [Ver ficha]                                                                    │
└─────────────┴────────────────────────────────────────────────────────────────────────────────┘
```

Notas: `Tipo` y `Estado` son filtros; `Deuda viva` usa el corte aplicado en la ficha o,
en el listado, todos los hechos registrados si no hay corte; `Conciliación` muestra la
vigente de mayor `fechaCorte` y añade `Varias` si hay más de una; nunca un cero de relleno.
El listado no suma Deuda a Saldos.

### 1440 px — ficha, corte, historia y conciliación

```text
D001 · Préstamo ficticio · No hipotecaria · Activa                                  [Editar]
┌ Control y capital ─────────────────────────────────────────────────────────────────────┐
│ Inicio control 01/10/2026 · Capital apertura 1.000,00 · Capital de control 1.000,00     │
│ Corte histórico [20/10/2026] [Aplicar]   Cobertura: desde control · 2 aplicables · 1 precontrol │
│ Capital aplicado 280,00 · Deuda viva 720,00                                             │
│ [No incluye intereses futuros, comisiones ni saldo bancario]                            │
└────────────────────────────────────────────────────────────────────────────────────────┘
┌ Condiciones informativas ──────────────────────────────────────────────────────────────┐
│ TIN 2,50 % · TAE 2,80 % · Cuota contractual 100,00 · [Sin informar] donde falte          │
│ Condiciones: [texto informativo, sin cálculo]                                           │
└────────────────────────────────────────────────────────────────────────────────────────┘
┌ Histórico precontrol (solo lectura; no reduce el capital) ─────────────────────────────┐
│ Capital inicial 1.200,00 · Amortizado histórico 200,00 · Extra histórica 0,00           │
│ Capital histórico en cuotas 1.200,00 · Intereses históricos 300,00 · Total pagado 1.500,00 │
│ Precontrol 2026 (R5): cuotas 3 · capital 50,00 · amortización extra 0,00            │
│ [El agregado R5 no reconstruye filas; la historia muestra solo los hechos registrados] │
│ [Comprobación histórica: sin diferencias / diferencia +X,XX]                            │
└────────────────────────────────────────────────────────────────────────────────────────┘
┌ Historia ejecutada ─────────────────────────────────────────────────────────────────────┐
│ Fecha       Tipo                  Total    Capital  Intereses Banco      Aplica          │
│ 30/09/2026  Gasto (precontrol)     70,00    50,00    20,00    -70,00     No              │
│ 01/10/2026  Gasto (cuota)         100,00    80,00    20,00   -100,00     Sí              │
│ 15/10/2026  Amortización deuda    200,00   200,00     0,00   -200,00     Sí              │
│ Totales desde control: capital 280,00 · intereses 20,00 · gasto 100,00 · banco -300,00   │
│ [Anulados: 0] [Ver ficha del Movimiento]                                                │
└────────────────────────────────────────────────────────────────────────────────────────┘
┌ Conciliación desde apertura ────────────────────────────────────────────────────────────┐
│ Corte 20/10/2026 · Declarado 750,00 · Derivado 720,00 · Diferencia +30,00 · Diferencia   │
│ Fuente [Banco ficticio] · Nota [Extracto ficticio]                                      │
│ [Corregir declarado] [Anular]   No crea Movimiento ni ajuste de capital.                │
│ Historial: 10/10/2026 · declarado 930,00 · derivado 920,00 · +10,00 · Vigente        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 390 px — listado, ficha y conciliación

```text
┌ MyFinanzas                    [Menú] ┐
│ Ciclo: [contexto del maestro]        │
│ Deudas                     [+ Nueva] │
│ Buscar [____________] [Filtros]      │
│ Préstamo ficticio · D001             │
│ No hipotecaria · Activa              │
│ Inicio 01/10/2026                    │
│ Apertura 1.000,00                    │
│ Deuda viva 720,00                    │
│ Conciliación +30,00 · Varias         │
│ [Ficha]                              │
├──────────────────────────────────────┤
│ Ficha D001 · [Editar]                │
│ Control y capital                    │
│ Corte [20/10/2026] [Aplicar]         │
│ Cobertura: ...                       │
│ Capital aplicado 280,00              │
│ Deuda viva 720,00                    │
│ [Condiciones] [Histórico]            │
│ [Historia] [Conciliación]            │
├──────────────────────────────────────┤
│ Conciliación                         │
│ Corte 20/10/2026                     │
│ Declarado 750,00                     │
│ Derivado 720,00                      │
│ Diferencia +30,00                    │
│ Historial 10/10/2026 · +10,00        │
│ Fuente [Banco ficticio]              │
│ [Corregir] [Anular]                  │
│ No crea Movimiento.                  │
└──────────────────────────────────────┘
```

Las secciones se apilan; no se oculta información financiera esencial en un acordeón sin
etiqueta. Los importes usan cifras tabulares y fechas `dd/mm/aaaa`. Las acciones destructivas
no dependen solo del color; foco visible, etiquetas asociadas, teclado y anuncios de estado.

### Vacíos, parcialidad, errores e incidencias

```text
Sin Deudas:
  No hay Deudas registradas. [Nueva deuda]  (sin semillas ni importes ficticios de relleno)

Sin condiciones:
  TIN [Sin informar] · TAE [Sin informar] · Cuota [Sin informar]  (no 0,00)

Sin histórico precontrol:
  Sin histórico precontrol aportado.  (no se reconstruye desde Movimientos)

Corte anterior al inicio de control:
  Corte 15/09/2026 · No hay deuda viva calculable antes de 01/10/2026.
  Agregado R5 disponible; H1 (30/09) no incluido. No se inventa capital.

Capital no calculable:
  Falta [apertura / Inicio control / desglose del Movimiento 123].
  No se muestra 0,00 ni se trunca.

Diferencia:
  Declarado 750,00 · Derivado 720,00 · Diferencia +30,00.
  Revisa los hechos o corrige el saldo declarado; no se crea un ajuste.

Conflicto:
  409 La Deuda o la conciliación cambió. Vuelve a cargar; el borrador se conserva.

Validación:
  422 campo/mensaje y foco; no se corrige automáticamente el desglose ni la diferencia.

Sesión:
  401/expiración MFA; conservar borrador y volver a identificarse. No persistir factores.
```

## Empty, loading and error states

- **Sin Deudas:** explicación y CTA; no semillas, importes ni Deudas de demo para cubrir el
  vacío.
- **Carga:** estado `Cargando Deuda…`/`Cargando historia…`; no sustituir por cero, `Sin
  informar` o una Deuda supuesta.
- **Sin condiciones/histórico/precontrol/conciliación:** `Sin informar`/`Sin declarar`/
  `Sin histórico precontrol`, distintos de cero y de “no aplica”.
- **Parcial:** mostrar cobertura, hechos excluidos por corte, precontrol separado y motivo
  de no calculabilidad. No presentar un subtotal parcial como deuda viva completa.
- **No calculable:** indicar qué falta (apertura, Inicio, desglose, deuda inexistente,
  corte anterior al control) y no mostrar un importe inventado.
- **Discrepancia:** diferencia exacta con signo, fuente y fecha; acciones de corrección,
  nunca un “resuelto” que oculte el dato.
- **Error de carga/red:** reintento y borrador conservado; no reemplazar por demo.
- **404:** Deuda/conciliación inexistente; no crear una entidad vacía.
- **409:** revisión obsoleta, duplicado vigente o contexto cambiado; conservar borrador y
  exigir recarga/revisión nueva.
- **422:** campo inválido, corte fecha futura, tasa/importe no exacto, texto fuera de
  límite o intento de escribir histórico/precontrol; mensaje accionable y foco.
- **401/403:** MFA/sesión/CSRF/Origin; no filtrar SQL, importes, notas, secretos ni stack.
- **Error técnico:** mensaje genérico con `requestId`; no payload financiero en logs.

## API behavior and external dependencies

Propuesta conceptual; no rutas implementadas. Se reutiliza Effect HTTP, autenticación MFA,
CSRF/Origin, límite JSON, errores `Problem` y transacciones existentes.

| Operación | Comportamiento |
| --- | --- |
| `GET /api/deudas` | Listado con búsqueda, estado y filtro `tipoDeuda`; paginación estable; incluye deuda viva y la conciliación vigente de mayor `fechaCorte`, con marca `Varias` si hay más |
| `GET /api/deudas/:id` | Ficha con control, condiciones, histórico/precontrol (solo lectura), historia ejecutada y conciliaciones |
| `GET /api/deudas/:id?corte=YYYY-MM-DD` | Misma ficha calculada al corte inclusivo; valida fecha y cobertura |
| `POST /api/deudas` | Alta con campos E1.6 + tipo/condiciones; histórico/precontrol no aceptado; `idempotency-key`; revisión inicial y auditoría |
| `PATCH /api/deudas/:id` | Edición con `revision`; nombre/estado/condiciones/tipo; histórico/precontrol no editable; apertura/Inicio protegidos por E1.6; auditoría |
| `POST/PATCH con histórico/precontrol` | 422: campo de solo lectura; no se crea ni corrige por esta API |
| `POST /api/deudas/:id/conciliaciones` | Alta de saldo declarado con fecha, importe, fuente/nota; idempotencia; una vigente por fecha |
| `PATCH /api/deudas/:id/conciliaciones/:cid` | Corrección/anulación con `revision` y motivo; auditoría; sin DELETE |
| `GET /api/deudas/:id/conciliaciones` | Historial vigente/anulado; puede incluirse en la ficha |

Reglas de API:

- Toda ruta exige sesión/MFA; las escrituras exigen Origin/CSRF y validación servidor.
- Rechazar campos derivados o de otra entidad; no aceptar `capitalPendiente`, `deudaViva`,
  `diferencia`, `cobertura`, `aplicaAlCapital`, `gasto` ni `estadoConciliacion` como entrada.
- Los campos históricos/precontrol R5 son de solo lectura: rechazar su escritura en `POST`/
  `PATCH` con 422. No hay endpoint de importación, alta o corrección histórica en E4.4.
- No hay endpoint de ajuste de capital, movimiento de apertura, transferencia, Gasto
  sintético ni DELETE.
- `corte` inválido o futuro -> 422; `fechaCorte` de conciliación futura -> 422;
  deuda/conciliación inexistente -> 404; revisión/duplicado -> 409; falta de sesión/CSRF ->
  401/403.
- Las escrituras se ejecutan en una transacción atómica: validar, reservar ID si procede,
  escribir, auditar e intentar. Un fallo revierte todo. La concurrencia revalida la Deuda,
  la conciliación y las entradas usadas.
- La huella/contexto de revisión incluye las nuevas entradas reales; un cambio entre
  previsualización y confirmación no se guarda con contexto obsoleto.
- Sin dependencias nuevas, ORM, servicios bancarios, importadores, Excel, VPS ni producción.

## Validation and edge cases

- **Apertura/Inicio:** ambos necesarios para deuda viva; ausencia no es cero; no se impone
  una regla de signo no demostrada a la apertura. Apertura negativa se muestra como
  discrepancia, no se trunca.
- **Frontera:** Fecha igual a Inicio control incluida; anterior excluida; otra Deuda
  excluida; varias Partidas del mismo Dxxx suman; no hay filtro por Tipo/Control/Fecha
  inicio de deuda en el agregado.
- **Desglose:** cuota con capital/intereses explícitos y suma exacta; extraordinaria con
  capital=importe/intereses=0; un Gasto ordinario sin Deuda no reduce capital; un desglose
  ausente/inválido en un hecho aplicable deja la deuda viva **no calculable**, no cero.
- **Anulación/rectificación:** anulado no reduce; rectificar sustituye el efecto anterior,
  no lo resta dos veces; si cambia la Deuda, ambas se revalidan; si cambia la fecha respecto
  al corte, el corte se recalcula; no se reconstruye el estado pasado.
- **Exceso:** E1.6 bloquea atómicamente un nuevo estado con capital verificable negativo;
  la igualdad deja cero exacto. E4.4 no relaja ni duplica esa regla. Un negativo heredado
  por apertura/datos se muestra, no se corrige por clamp.
- **Corte:** inclusivo; antes del control no calculable; después del último hecho usa todos;
  futuro 422; no usa reloj para el capital; no persiste foto; no reconstruye precontrol.
- **Conciliación:** diferencia exacta; cero = conciliado; no comparable si falta base;
  duplicado vigente = 409; fecha futura = 422; corrección/anulación con motivo; no crea
  hechos; anulada no aparece como vigente pero se conserva.
- **Condiciones:** TIN/TAE/cuota/condiciones informativas; no calculan; desconocido no es
  cero; valores no exactos/fuera de límite -> 422; no se infiere por nombre ni histórico.
- **Histórico/precontrol:** solo lectura en E4.4; `POST`/`PATCH` con esos campos -> 422;
  ausencia = `Sin informar`; no backfill/reconstrucción; corrección solo por una vía futura
  autorizada (E4.5/E4.12/DT7), no por esta entrega.
- **Tipo:** enum cerrado `Hipotecaria`/`No hipotecaria` o `null` (= Sin informar); no se
  persiste el literal `Sin informar`; no se infiere; no se suma a Saldos; no se crea activo
  inmobiliario.
- **Precisión:** EUR exacto; tasas exactas; sin float, redondeo, truncamiento ni overflow;
  textos acotados; fechas civiles válidas.
- **Concurrencia/idempotencia:** dos altas/ediciones concurrentes no pisan; reintento con
  la misma clave devuelve el mismo resultado; una respuesta perdida no duplica; una clave
  con otro payload -> 409.
- **Compatibilidad:** main v16 actual; migración futura desde la versión vigente; datos
  existentes sin backfill; rollback/versión desconocida; backup/restore; E1.1–E1.6 intactos.

## Security, persistence and compatibility

- **Acceso:** MFA, sesión única, CSRF/Origin y autorización servidor en todas las rutas;
  no se confía en la UI. Sin token persistido en navegador ni recuperación alternativa.
- **Datos:** las notas/fuentes de conciliación pueden contener información privada; no se
  registran en logs, no se ofrece exportación funcional y se escapan en la UI. El backup
  protegido sí incluye las notas/fuentes como parte del snapshot; no se publica. No se
  publican bases, claves, factores ni capturas con datos reales.
- **Integridad:** derivados solo en servidor; validación exacta; transacción atómica;
  auditoría append-only; sin DELETE; sin tablas de capital/historia paralelas.
- **Persistencia:** migración versionada/atómica, STRICT/FK/WAL/busy_timeout heredados;
  rollback, versión desconocida y arranques concurrentes probados antes de ampliar UI.
- **Compatibilidad:** no se cambia la matriz de cuatro Tipos, el pipeline de Movimientos,
  la fórmula E1.6, las protecciones de Partidas/Deudas, Ciclos, Referencias ni Saldos.
  E4.5/E4.6/E4.7/E4.11 no se implementan aquí; solo se expone el contrato de lectura.
- **Backup/restore:** el snapshot incluye los nuevos campos y conciliaciones; el manifiesto
  etiqueta la versión correcta; la restauración aislada conserva MFA/acceso y no mezcla
  demo/producción. No se configura copia externa, scheduler ni RPO/RTO operativo.

## Exclusions

- No desarrollo, código, SQL operativo, migración real, bases, Excel, datos personales, VPS,
  deploy, merge ni cambio de visibilidad.
- No simulación avanzada, cuadro de amortización, calendario de cuotas futuras, cálculo de
  intereses por TIN/TAE, previsión ni proyección.
- No reconstrucción de hechos precontrol ausentes, no alta/corrección de histórico/precontrol
  por esta entrega, no importación E4.5, no archivo histórico, no fotos E4.11, no cierre
  E4.8–E4.10, no resumen E4.6/E4.7.
- No activo inmobiliario, valor de garantía, LTV, tasación ni patrimonio hipotecario.
- No comisiones/penalizaciones: no hay componente aprobado; un caso futuro requiere spec y
  aprobación financiera propias.
- No Deuda como Saldo, no saldo negativo artificial, no Movimiento/Transferencia/Gasto de
  apertura o ajuste, no compensación automática.
- No cambios de la fórmula Q1 ni de los contratos de escritura E1.6/E1.1–E1.5; sí se admite
  el ajuste de lectura mínimo para no convertir `null` en cero, con regresión. No se tocan
  E2, E3, B3/Dev32, D5, DEV16, E4.1, metodología, Skills, guardas o workflows.
- No se fija versión futura de esquema.

## Acceptance checks

Clase **I** = criterio de E4.4 en su futura implementación; **C** = contrato de consumo o
compatibilidad futura. Todos son **PREVISTOS/NO EJECUTADOS**; una prueba diseñada no es PASS.

**IDs locales:** en este documento `AC-01…AC-33` significan `E4.4-AC-01…E4.4-AC-33`
(con guion) y no son los `E1.6-AC-31…E1.6-AC-33`; cuando se citan estos últimos se prefijan
con `E1.6-`. Los criterios del roadmap se citan sin guion como `E4.4-AC1/2/3`.

| ID | Acción / precondición | Resultado observable esperado | Clase | Traza |
| --- | --- | --- | --- | --- |
| AC-01 | Alta/consulta de Deuda con campos E1.6 + tipo/condiciones | Dxxx estable; apertura/Inicio; tipo/condiciones conservados; histórico/precontrol no se escribe aquí; desconocidos null/Sin informar; sin Movimiento/Saldo de apertura | I | E4.4-AC1 |
| AC-02 | Aportar TIN/TAE/cuota/condiciones y consultar | Valores informativos exactos; no calculan intereses/cuotas/cuadros; desconocido ≠ 0; inválidos 422 | I | E4.4-AC1 |
| AC-03 | Clasificar Hipotecaria/No hipotecaria o dejar null (= Sin informar); filtrar; Deudas existentes | Enum cerrado; null se presenta Sin informar; sin inferencia; filtro correcto; sin activo/LTV | I | E4.4-AC3 |
| AC-04 | Leer histórico/precontrol R5 e intentar escribirlo por POST/PATCH | Se muestra el dato existente; escritura ordinaria 422; solo lectura; sin backfill; no operandos; no se reconstruye | I | E4.4-AC1 |
| AC-05 | Histórico con relación R5 inconsistente | Diferencia exacta señalada; no se corrige desde E4.4; no se trunca; capital intacto | I | E4.4-AC1 |
| AC-06 | Cuota/extraordinaria vigentes desde Inicio control | Capital aplicado = suma de capital; deuda viva = apertura − aplicado; solo capital; sin doble cómputo | I | E4.4-AC2 |
| AC-07 | Cuota 100 (capital 80, intereses 20) | Historia muestra 100/80/20; Gasto 100; banco −100; capital −80; un solo hecho | I | E4.4-AC2 |
| AC-08 | Extraordinaria 200 | Historia muestra 200/200/0; banco −200; Gasto 0; capital −200; no Transferencia | I | E4.4-AC2 |
| AC-09 | Hecho precontrol con Gasto/capital/intereses | Visible como precontrol; `aplicaAlCapital=false`; banco/Gasto reales; deuda viva no cambia | I | E4.4-AC2 |
| AC-10 | Corte inclusivo con hechos antes/el día/después | Solo `fecha <= corte`; el día incluido; posteriores excluidos; otra Deuda excluida; varias Partidas suman | I | E4.4-AC2 |
| AC-11 | Corte antes de Inicio control, sin Inicio o sin apertura | Deuda viva no calculable con motivo; cobertura precontrol; sin 0 inventado | I | E4.4-AC2 |
| AC-12 | Apertura ausente vs. cero explícito | Ausente = no calculable; cero explícito = cero; no se normaliza | I | E4.4-AC2 |
| AC-13 | Hecho aplicable con capital/intereses ausentes o inválidos | Deuda viva no calculable; se listan IDs afectados; no se trata null como 0 | I | E4.4-AC2 |
| AC-14 | Capital resultante negativo o exceso heredado | Se muestra negativo/diferencia; sin clamp; E1.6 sigue bloqueando nuevos estados verificables negativos | I | E4.4-AC2 |
| AC-15 | Alta de saldo declarado y comparación; fecha no futura | Diferencia = declarado − derivado exacta; 0 = Conciliado; ≠0 = Diferencia; fecha futura 422; listado usa la última y marca `Varias`; sin cambio de capital | I | E4.4-AC2 |
| AC-16 | Corregir/anular conciliación con motivo | Revisión/auditoría; anulada no vigente pero conservada; sin DELETE; capital intacto | I | E4.4-AC2 |
| AC-17 | Conciliación antes del control o sin base calculable | Estado No comparable con motivo; no se inventa diferencia | I | E4.4-AC2 |
| AC-18 | Dos altas de conciliación vigentes misma Deuda/fecha | 409 en la segunda; la corrección se hace sobre la existente; fechas distintas permitidas y el listado las marca `Varias` | I | E4.4-AC2 |
| AC-19 | Concurrencia/reintento en alta/edición/conciliación | Revisión obsoleta 409; idempotencia devuelve una sola entidad; sin escritura parcial | I | E4.4-AC2 |
| AC-20 | Corregir tipo/condiciones con revisión | Auditoría antes/después/motivo; sin efecto económico; histórico/precontrol no editable; apertura/Inicio usados siguen protegidos | I | E4.4-AC1 |
| AC-21 | Rectificar/anular un pago y consultar corte/conciliación | Deuda viva y diferencia se recalculan; ambas Deudas si cambia; no doble resta; historia conservada | I | E4.4-AC2 |
| AC-22 | Inspeccionar persistencia y endpoints | No se persiste capital/deuda viva/historia; no hay ajuste ni segundo ledger; derivados rechazados | I | E4.4-AC2 |
| AC-23 | Migrar desde la versión vigente de main (hoy v16) | Campos nuevos null/Sin informar; IDs/auditoría/MFA/relaciones preservados; rollback/versión desconocida | I | E4.4-AC1 |
| AC-24 | Backup/restore del esquema ampliado | Manifiesto/versión correctos; campos/conciliaciones/MFA recuperables; sin datos reales | I | E4.4-AC1 |
| AC-25 | Consumidor E4.6/E4.7 lee la Deuda | Recibe capital/tipo separados; no suma Deuda a Saldos; no duplica Gasto/capital; hipoteca identificable | C | E4.4-AC3 |
| AC-26 | Acceso sin MFA/CSRF/Origin; payload con derivados; errores | 401/403/422; sin fuga SQL/importes/notas/secretos; sin DELETE; límites JSON | I | E4.4-AC1 |
| AC-27 | Recorrer listado/ficha/condiciones/histórico/corte/conciliación a 1440 | Tabla/secciones, etiquetas, foco, teclado, contraste, sin overflow; sin cuadro de amortización | I | E4.4-AC1 |
| AC-28 | Recorrer las mismas pantallas a 390 | Tarjetas/secciones apiladas; acciones accesibles; información esencial visible; sin overflow | I | E4.4-AC1 |
| AC-29 | Vacío/carga/error/parcial/no calculable/diferencia/401/404/409/422 | Estados diferenciados; borrador conservado; sin valores/demo de relleno; foco accionable | I | E4.4-AC1 |
| AC-30 | Intentar simulación/cuadro/previsión/comisión/activo/ajuste | Rechazo o exclusión explícita; no se crea hecho, cuota futura, activo ni ajuste | I | E4.4-AC2 |
| AC-31 | Regresión E1.1–E1.6 y matriz de cuatro Tipos | Reglas previas conservadas; cuota Gasto íntegro; extraordinaria no Gasto; sin Exterior Transferencia/E3/cierre | I | E4.4-AC2 |
| AC-32 | Precisión/límites de EUR, tasas, textos y fechas | Exactitud, sin float/redondeo/overflow; 422 en tercer decimal, tasa/texto/fecha inválidos | I | E4.4-AC1 |
| AC-33 | Cambios de Deuda/conciliación y auditoría | Actor único, UTC, anterior/posterior, motivo; append-only; no datos sensibles en logs | I | E4.4-AC1 |

### Cobertura de la traza roadmap

| Roadmap | AC de esta spec |
| --- | --- |
| E4.4-AC1: conservar inicio/capital/TIN/TAE/cuota/condiciones | AC-01, AC-02, AC-04, AC-05, AC-20, AC-23, AC-24, AC-26–AC-29, AC-32, AC-33 |
| E4.4-AC2: principal solo por capital desde control, sin inventar amortizaciones | AC-06–AC-19, AC-21, AC-22, AC-30, AC-31 |
| E4.4-AC3: distinguir deuda no hipotecaria e hipoteca sin Deuda como Saldo | AC-03, AC-25, AC-31 |

## Test plan

El [testplan E4.4](17-e44-deuda-completa-testplan.md) contiene la matriz
AC → riesgo → caso positivo/negativo → comprobación futura → entorno. Todos los resultados
están **UNRUN**; no hay implementación ni PASS funcional. La prueba diseñada no acredita la
funcionalidad.

## Approval and next action

- **Decisiones financieras/materiales:** Q1–Q7 confirmadas expresamente por el usuario el 2026-10-27; evidencia directa y alcance en brainstorming. No supone aprobación de esta spec.
- **Especificación/wireframes:** **NO aprobados**. Pendiente de revisión final de Codex y
  aprobación explícita del usuario.
- **QA independiente:** se coordinó sobre SHAs concretos; el revisor no aprueba reglas
  financieras, no amplía alcance, no escribe epic-board y no hace merge. Dictamen documental
  final registrado en el testplan; no es PASS funcional.
- **Desarrollo:** no autorizado. Cualquier autorización será posterior y separada; no se
  infiere de la aprobación documental.
- **SQL/migración:** no autorizados ni fijados; el dev comprobará `main` y la versión vigente.
