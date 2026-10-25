# 13 — E3.1 Anticipos y pendiente por caso: Specification
Status: rev3 APPROVED + enmienda Q9 APPROVED — 2026-10-25
Approval source/date: Usuario, 2026-10-25: «De momento no esta open, asi q seguimos solo por aqui, Propuesta aprobada». Esta aprobación documental no autorizaba desarrollo13 ni merge; autorización posterior y suspensión vigente se distinguen abajo.
Context and brainstorming: [ronda base y Q1–Q6 confirmadas](13-anticipos-brainstorming.md),
decisiones Q1–Q8 del usuario 2026-10-25; resolución Q7/Q8 registrada al final del brainstorming. Base `10bb794`; revisión documental aislada en `codex/spec13-documentary-rev2`.

La rev3 integrada mantiene su aprobación. La enmienda Q9 al final de este
documento precisa y, donde corresponda, sustituye sus contratos de atribución
por dirección. Enmienda completa aprobada por el usuario el 2026-10-25 («Aprobado»),
tras las dos precisiones de Álex en PR70. Dev13 sigue detenido hasta reanudación expresa.

Estado temporal de autorización: tras integrar rev3, el usuario autorizó dev13
(«Autorizo dev13») y su implementación tras aviso de cuota («Sigue implementacion»).
Esa autorización previa existe; la ejecución se suspendió en B13-1. La aprobación
completa Q9 del 2026-10-25 resuelve su gate documental. PR70 pendiente de merge
con aprobación propia; dev13 permanece suspendido hasta instrucción expresa de
reanudación y comprobación de gates de cuota. No código ni merge en esta ronda.

## Functionality

Ficha de caso 1:1 con su Referencia de tipo Anticipo. Motor único que calcula
Adelantado, Recuperado, Neto pendiente, Exceso, fechas y estado del caso a partir
de Transferencias reales elegibles: misma Referencia y dirección correcta.
Alta atómica de Referencia y ficha en una única transacción con rollback completo.
Devolución como Transferencia inversa real; nunca ejecuta el Presupuesto.
Apertura histórica por caso con evidencia y trazabilidad. Neto apertura del ciclo
conservado como fotografía, no sustituido por el pendiente actual.

### Autoridad de cada regla

| Nivel | Fuente | Tratamiento |
| --- | --- | --- |
| Funcional v5.11 R4 | Anticipos: Transferencias con la misma Referencia; devolución inversa del receptor al que adelantó; adelantado/recuperado/neto/exceso, fechas y estado de un motor único; foto de Neto apertura del ciclo conservada; variantes históricas con Exterior cuando la fuente lo registre | Contrato funcional; sin equivalencia numérica afirmada con el Excel |
| Roadmap E3.1 | E3.1-AC1 devolución por Transferencia inversa y misma Referencia; AC2 motor único; AC3 Neto apertura preservado, no sustituido por pendiente actual ni reconstruido sin evidencia | Obligatorio de la entrega |
| Q1–Q6 | Alta atómica 1:1; definiciones del motor y estados propios; exclusión e historial «Revisar» de incompatibles; Exterior histórico no seleccionable; tres fechas diferenciadas; atajo de devolución guiada | Confirmadas por el usuario el 25/10/2026 |
| Contratos integrados | E1.4 Movimientos/Saldos y rectificación; E1.5 Referencias (CAT012 bloqueada por E3.1; rectificar retrocede Referencia; sin DELETE físico); E2.1 Ciclos; E2.3 devoluciones no ejecutan Aportación y sin fuente Devolución anticipo | Reutilizados tal cual; no se reabren |
| Q7/Q8 | Varios pares con selección explícita y conflictos bloqueantes; confirmación explícita de una foto por Referencia+Ciclo, evidencia, signo y protección histórica | Confirmadas por el usuario/Álex el 25/10/2026; autorización documental únicamente |
| Propuesta técnica rev3 | Persistencia mínima, read model, DTO, pantallas | Sujeta a esta revisión; el diseño de persistencia queda cubierto por DT2 al aprobarse la spec |

## Data model and contracts

Rev3 y enmienda Q9 aprobadas; sin DDL ejecutado. La autorización previa de dev13 está suspendida en B13-1.

- `fichas_anticipos`: `referencia` FK única a REFxxx tipo Anticipo; `creado` y
  `actualizado` UTC como datos de auditoría técnica. UNIQUE(referencia). La ficha
  no persiste importes derivados: todos se calculan en el motor desde Movimientos.
- `ficha_fecha_apertura`: por ficha; valor derivado del primer adelanto verificable,
  o declaración manual para casos anteriores a la app, con marca «Manual», evidencia
  y trazabilidad. Sin fecha establecida queda ausente, no 0.
- `fotos_neto_apertura`: una fotografía confirmada por ID Referencia+ID Ciclo
  (unicidad transaccional), con importe pendiente en apertura financiera, ID Ciclo,
  fecha Inicio de referencia, fuente/procedencia, evidencia identificable,
  auditoría, fecha de confirmación y estado de cobertura verificable.
  Fecha de confirmación y fecha de Inicio son distintas; una confirmación tardía
  no cambia el instante financiero representado. No crear fotos en GET.
  Correcciones excepcionales preservan trazabilidad del original, exigen revisión
  de impacto, motivo, auditoría y protección de cierres/fotos; no crean una segunda
  foto vigente ni movimientos de cuadre. Reutilizar contratos de revisión existentes;
  no dar por implementadas protecciones de cierres futuros.
- Pares: derivados de Movimientos y Referencia cuando sean fiables, sin entidad
  adicional innecesaria. Una recuperación se cuenta una vez por ID de hecho;
  agregación por par y global usan el mismo motor y revisión coherente.
- Read model: ficha, derivados del motor, historial de adelantos y devoluciones
  elegibles y no elegibles con motivo, marcas «Revisar», coberturas y fechas con
  su tipo. Catálogo, auditoría, seguridad, idempotencia y validaciones existentes
  reutilizados; identidad por REF estable, nombre solo presentación.
- Importes exactos: DTO EUR completo como string, sin binario flotante ni
  redondeo prematuro; fechas de caso civiles ISO; timestamps UTC solo auditoría.
- CAT012 → Anticipo sale de «Bloqueada por dependencia E3.1» solo al integrarse
  esta entrega; el contrato de matriz E1.5 se mantiene.

## Screens and interfaces

Wireframes rev3 con datos ficticios, aprobados por el usuario el 2026-10-25.
Precondición Q9 de todos los ejemplos positivos: roles Adelanto/Devolución y
orientación/par explícitamente acreditados por ID de Movimiento y evidencia.
Las flechas y fechas solo presentan hechos; nunca acreditan su rol por sí solas.
Los wireframes extienden el diseño visual común aprobado (desktop 1440, móvil 390) y sus tokens; sin color
sin icono/texto; ausencia explicitada como «No disponible», nunca 0 ni guion.

```text
FICHA — [REFxxx · nombre]            [Estado: Recuperación parcial]
Adelantado      1.500,00 €   Verificado · 2 adelantos elegibles
Recuperado        500,00 €   Verificado · 1 devolución elegible
Neto pendiente  1.000,00 €   Verificado
Exceso             0,00 €   Verificado · sin exceso
Fechas: primer adelanto 03/02/2026 · última actividad 15/03/2026
Fecha apertura del caso: 10/01/2026 [Manual · evidencia registrada]
Fecha técnica de creación: 12/01/2026 10:14 UTC — auditoría, no financiera
────────────────────────────  tabla de operaciones  ────────────────────────────
Fecha       Tipo        Importe     Origen → Destino        Ref     Estado
03/02/2026  Adelanto    1.000,00 €  Cta principal → Laura   REFxxx  Elegible
03/02/2026  Adelanto      500,00 €  Cta principal → Laura   REFxxx  Elegible
15/03/2026  Devolución    500,00 €  Laura → Cta principal   REFxxx  Elegible
[Registrar devolución] [Confirmar Neto de apertura]
────────────────────────────  NETO DE APERTURA DE CICLO  ─────────────────────
Ciclo desde 20/06/2026 · Neto apertura: 1.000,00 € [Confirmada · cobertura verificada · Ver evidencia]
Ciclo anterior · No disponible — sin fotografía ni evidencia suficiente
No se modifica por devoluciones posteriores del caso.
```

```text
ALTA NUEVA — Referencia Anticipo                     [Cancelar] [Crear ficha]
Nombre [Anticipo formación Laura]      Tipo: Anticipo (fijo en esta alta)
Fecha apertura histórica (opcional, para casos previos) [__/__/____] marca «Manual»
 + evidencia/trazabilidad
Al confirmar: REFxxx Activa + ficha 1:1 en la misma transacción;
cualquier fallo provoca rollback completo, sin REF ni fichas parciales.
```

```text
REGISTRAR DEVOLUCIÓN — formulario común de Transferencia
Referencia: REFxxx (precargada, requerida)
Origen:  Laura (destino del adelanto) → Destino: Cta principal (origen del adelanto)
Importe: [1.000,00 € = pendiente recuperable propuesto, editable]
Fecha real: [__/__/____]   Concepto: [libre]
[!] Si el importe supera el pendiente del par: aviso de exceso del par.
    El estado global depende del motor único sobre todos los pares;
    el importe real no se corrige silenciosamente.
[Revisar y confirmar] → una única Transferencia real por el servicio común,
sin ejecución de Presupuesto y sin simulación de ejecución bancaria.
```

El ejemplo no incluye otras Referencias ni etiqueta un adelanto válido como
devolución incompatible. «Revisar» requiere evidencia de incoherencia verificable;
la dirección por sí sola no acredita que una Transferencia sea una devolución.
Para variantes históricas con Exterior, el atajo «Registrar devolución» no está
disponible y se muestra el motivo: el servicio común actual no admite Exterior.
Con un único par inequívoco y verificable se propone su inversa.
Con varios pares, selección explícita antes de precargar; con dirección ambigua
se bloquea el atajo y se muestra el conflicto, sin reparto ni elección implícitos.

```text
DEVOLUCIÓN — misma REF, varios pares verificables (datos ficticios)
Selecciona el adelanto/par que recuperas (sin selección automática):
[ ] Cta A → Saldo B | Adelantado 1.000 | Recuperado 200 | Pendiente 800 EUR
[ ] Cta A → Saldo C | Adelantado   500 | Recuperado 100 | Pendiente 400 EUR
Seleccionado A→B: devolución Saldo B → Cta A
Importe [800,00 editable] Fecha real [editable] [Revisar y confirmar]
Aviso si supera 800: posible Excedido; conservar importe real.
Conflicto: par original no identificable → atajo bloqueado [Ver hechos]
```

```text
CONFIRMAR NETO DE APERTURA — REFxxx · Ciclo IDxxx · Inicio 20/06/2026
Pendiente al abrir [importe firmado EUR]  Fuente/procedencia [identificar]
Evidencia [referencia identificable]  Cobertura [estado y motivo]
Sugerencia solo si hechos anteriores al Inicio y cobertura verificables.
Misma fecha sin orden verificable: aportar evidencia; si falta → No disponible.
Confirmación hoy no convierte el pendiente actual en apertura histórica.
[Revisar impacto y confirmar]  [Cancelar]
Foto existente: importe, Inicio, confirmación, cobertura y evidencia visibles.
[Solicitar corrección excepcional] → motivo + impacto + revisión de protecciones.
```

En 390 las filas de pares y la confirmación se presentan como tarjetas verticales,
con etiquetas completas, selección por teclado y revisión previa; no dependen del
color. Cancelar conserva la foto; carga/error no confirma ni duplica registros.

Móvil 390: cabecera con nombre + badge de estado; tarjetas por métrica con estado
y cobertura; fechas compactas con su tipo; acción devolver visible cuando Q6 lo permite; aviso «Revisar»
permanece visible sin depender de tooltips; ausencia como «No disponible».

## Empty, loading and error states

- Referencia/ficha no encontrada: mensaje accionable; no tabla de ceros.
- Sin movimientos elegibles: estados «Sin operaciones» o No disponible según
  cobertura; nunca Recuperado por igualdad artificial 0=0.
- Carga y error conservan ficha y selección; respuesta antigua no sustituye datos
  nuevos; el error de una fuente no borra el contexto de otras; se muestra alcance
  y bloquean solo los agregados dependientes.
- Fallo de la alta: rollback completo + mensaje de causa segura, sin payload.
- Exceso en la devolución: advertencia visible antes de confirmar.
- Sesión expirada: conserva selección y pide reautenticar sin exponer datos.

## API behavior and external dependencies

- Propuestas: `GET /api/anticipos/fichas` con paginación (lista de fichas y
  estado); `GET /api/anticipos/fichas/{id}` (derivados, historial, cobertura);
  `POST /api/anticipos/fichas` (alta atómica Referencia+ficha). Sin DELETE físico.
  El atajo de devolución reutiliza el servicio común de Transferencias; no hay
  endpoint paralelo de movimientos ni escritura directa de la ficha.
- Reutilizar autenticación, auditoría, idempotencia, validación de dirección y
  controles de concurrencia existentes en todo método; sin rutas de fixtures ni
  bypass; sin operaciones inválidas creadas para probar.
- Estado y error no se deducen solo de HTTP200; sin SQL, factores ni payload
  bancario en logs públicos; sin datos financieros en URLs.
- Consultas de catálogos y posiciones abarcan todos los IDs relevantes con sus
  conteos; la paginación nunca trunca agregados de la ficha.
- E3.2/E3.6 no anticipados: consumidores futuros consumen el motor único cuando
  exista; nada se duplica ni se persiste por adelantado.

### Confirmación de apertura y protocolo propuesto

Acción autenticada explícita del usuario; desde ficha o revisión conjunta cuando
proceda, cada confirmación conserva la identidad Referencia+Ciclo. Propuesta:
`POST /api/anticipos/fichas/{id}/netos-apertura` para confirmar y una operación
revisada de corrección excepcional sobre esa misma foto. Contratos técnicos
sujetos a aprobación completa: revisión esperada, idempotencia, evidencia,
impacto y auditoría en transacción; confirmaciones concurrentes/replay no crean
otra foto. GET es solo lectura. Fallo revierte íntegramente.

La evidencia debe justificar importe e instante de apertura y su cobertura.
No bastan una coincidencia con el pendiente actual ni una lista de movimientos
sin cobertura acreditada. La sugerencia automática solo usa hechos anteriores al
Inicio con cobertura verificable. Operaciones posteriores no sirven para
reconstruir; hechos del mismo día requieren orden respecto a apertura verificable
o evidencia explícita, de otro modo No disponible. Cero requiere evidencia;
neto negativo por exceso histórico justificado conserva signo y procedencia.
Confirmación tardía mantiene Inicio, evidencia histórica y fecha real de confirmación.
La corrección requiere revisión de impacto y protección de cierres/fotos: si una
protección no puede verificarse, no confirmar la corrección por inferencia.

## Validation and edge cases

- Dirección correcta: la devolución es inversa exacta del adelanto (receptor →
  quien adelantó) con la misma Referencia; nueva operación incompatible con el
  caso se bloquea; histórica incompatible se marca «Revisar» y no computa; sin
  corrección automática de dirección o Referencia; separar advertencia de
  conciliación de error estructural.
- Referencia distinta: la operación pertenece a su propia Referencia; sin
  atribuirla por similitud de importe, fecha o Saldos; sin movimientos
  compensatorios inventados.
- Estados del caso derivados: Sin recuperar (adelanto sin devolución);
  Recuperación parcial (devolución positiva inferior al adelantado); Recuperado
  (importes iguales); Excedido (recuperado superior). Con movimientos
  insuficientes: «Sin operaciones» o No disponible según cobertura; nunca
  Recuperado por 0=0. Fórmulas: Adelantado=Σ adelantos elegibles; Recuperado=
  Σ devoluciones elegibles; Neto pendiente=Adelantado−Recuperado;
  Exceso=MAX(Recuperado−Adelantado, 0). No reutilizar Pendiente/Completo/Excedido
  del motor de Presupuestos.
- Fechas: solo de Transferencias reales elegibles; primer adelanto derivado;
  fecha técnica de creación de ficha solo auditoría; fecha histórica manual
  marcada con evidencia; no rellenar ausentes con hoy ni fecha de importación.
- Foto de Neto apertura: registro por ciclo conservado; no sustituido por pendiente
  actual; no reconstruido con movimientos incompletos; sin evidencia → «No
  disponible» con motivo; sin modificación automática por devoluciones. Solo
  corrección excepcional revisada conforme Q8, con original trazable y protección histórica.
- Desactivar Referencia conserva ficha e historial; reactivar no crea operaciones.
- Concurrencia: devoluciones simultáneas no duplican el mismo hecho ni derivan
  el estado de un recuento distorsionado; la respuesta de la ficha es coherente
  con una única revisión del motor.

## Exclusions

Desarrollo, SQL/Excel real, merge, deploy, VPS, publicación no aprobada e
investigación B3/Dev32 fuera de esta revisión. Sin motores de Compartido
(E3.2), Comida (E3.5) o informes (E3.6); la mejora «registro coordinado de
gastos con transferencia o anticipo» queda en backlog independiente; sin
importación de histórico real en esta fase; sin motor de presupuesto paralelo
ni fuente Devolución anticipo; sin ampliar Transferencias nuevas con Exterior
(sin contrato y autorización específicos); sin reabrir Q1–Q6 ni decisiones de
E1/E2 ya aprobadas.

## Acceptance checks

Diseño de prueba. Precondición de todos los positivos que usan Adelanto/Devolución
(incluidos AC-05–07, 11, 14, 16–19, 23 y 27–36): rol y orientación/par acreditados
explícitamente conforme Q9. Sin acreditación se aplican ND/Revisar y cobertura
Parcial de Q9; dirección/fecha aisladas no satisfacen estos positivos.
La autorización previa de desarrollo permanece suspendida en B13-1.

| ID | Acción / precondiciones | Resultado observable esperado |
| --- | --- | --- |
| AC-01 | Alta de Referencia Anticipo nueva | REFxxx Activa y ficha 1:1 creadas en una única transacción; sin ficha sin REF ni REF sin ficha |
| AC-02 | Fallo en cualquier paso del alta | Rollback completo; sin REF parcial ni ficha huérfana; mensaje de causa segura |
| AC-03 | Alta duplicada o simultánea de la misma referencia | Rechazada por unicidad con idempotencia; no hay segunda ficha |
| AC-04 | Desactivar Referencia con historial | Ficha y motor conservan historial; sin DELETE físico; reactivar no crea operaciones |
| AC-05 | Adelantos 1000+500 y devolución 500 con rol/par acreditados Q9 | Recuperación parcial; Adelantado 1500, Recuperado 500, Neto 1000, Exceso 0 verificado; fechas por transferencias reales |
| AC-06 | Devolución igual al adelantado, roles/par acreditados Q9 | Estado Recuperado; sin doble cómputo ni evento de cierre financiero inferido |
| AC-07 | Devolución 1800 sobre adelantado 1500, roles/par acreditados Q9 | Advertencia de exceso antes de confirmar; caso pasa a Excedido; Exceso 300; importe real intacto |
| AC-08 | Ficha sin movimientos elegibles | «Sin operaciones» o No disponible según cobertura; nunca Recuperado por igualdad 0=0 |
| AC-09 | Devolución nueva con dirección equivocada acreditada respecto a un par verificable | Bloqueada al guardar; histórica equivalente marcada «Revisar» y no computada; sin autocorrección |
| AC-10 | Devolución con otra Referencia | Pertenece a su propia ficha; no computada en la ficha consultada; sin atribución por similitud |
| AC-11 | Variante histórica con receptor Exterior | Preservada y etiquetada con procedencia; sin ficha ficticia ni cambio retrospectivo; atajo de devolución no disponible con motivo |
| AC-12 | Alta nueva de transferencia de Anticipo con Exterior | Exterior no es seleccionable; ampliación futura exige contrato y autorización específicos |
| AC-13 | Fecha apertura anterior declarada manual | Registrada con marca «Manual» + evidencia y trazabilidad; sin relleno con hoy ni importación |
| AC-14 | Foto de Neto apertura registrada y devolución posterior | Foto intacta tras la devolución; importe y procedencia visibles |
| AC-15 | Ciclo sin fotografía ni evidencia suficiente | «Neto apertura del ciclo: No disponible»; no 0 ni pendiente actual |
| AC-16 | Tres campos de fecha en pantalla | Primer adelanto, fecha técnica de auditoría y apertura (Manual/Derivada) claramente diferenciados |
| AC-17 | Atajo «Registrar devolución» con par seleccionado verificable y sin Exterior | Formulario común con Referencia, origen/destino inversos y pendiente recuperable propuesto; importe y fecha editables; revisión previa |
| AC-18 | Confirmación del atajo | Única Transferencia real por el servicio común; ficha recalculada solo por el motor central; idempotencia aplicada |
| AC-19 | Devolución en ciclo distinto del adelanto | Estado derivado correcto sin doble devolución; sin ejecución de Presupuesto; foto intacta |
| AC-20 | Operación marcada «Revisar» | Aviso de conciliación visible y diferenciado del error estructural; navegable al detalle |
| AC-21 | Persistencia mínima y consulta | Lectura de fuentes canónicas necesarias (Movimientos, Referencias, Saldos y Ciclos) por contratos existentes; consulta sin escritura en esas fuentes ni caché de derivados como fuente de verdad; alta/Transferencia solo por sus servicios autorizados |
| AC-22 | Exactitud monetaria y de fechas | EUR como string exacto; sin flotante; fechas civiles para el caso y UTC solo auditoría |
| AC-23 | Auditoría, idempotencia y concurrencia | Sin duplicar hechos en devoluciones simultáneas; coherencia por revisión del motor |
| AC-24 | Accesibilidad 390/1440 | Estados con icono+texto; «No disponible» explícito; sin tooltips imprescindibles; teclado y foco correctos |
| AC-25 | Seguridad | Acceso protegido por método; sin SQL ni payload bancario en logs; sin rutas de fixtures; sesión expirada |
| AC-26 | Contratos reutilizados sin duplicación | Sin endpoint paralelo ni escritura directa de Movimientos fuera del servicio común; la ficha permite confirmar explícitamente Neto apertura por su protocolo; CAT012 habilitada solo al integrar |


## Trazabilidad de aceptación al roadmap

| Criterio obligatorio | Comprobaciones locales que lo desarrollan |
| --- | --- |
| E3.1-AC1 | AC-09–12, AC-17–19; integridad del caso AC-01–04; AC-27–29 para varios pares |
| E3.1-AC2 | AC-05–08, AC-16, AC-20, AC-22–23; fuentes y reutilización AC-21/26 |
| E3.1-AC3 | AC-13–15, AC-19; AC-30–36 para confirmación y protección histórica |
| Transversales | AC-24/25 apoyan todos los criterios sin sustituir sus pruebas financieras |

## Aceptación adicional Q7/Q8

Diseño de pruebas, sin ejecución funcional. Q7/Q8 confirmadas; propuesta completa
rev3 y wireframes aprobados el 2026-10-25.

| ID | Acción / precondiciones | Resultado observable esperado |
| --- | --- | --- |
| AC-27 | Misma REF con adelantos A→B y A→C explícitamente acreditados Q9; abrir devolución | Sin par elegido automáticamente; selección explícita muestra origen/destino y adelantado/recuperado/pendiente verificables; precarga inversa del seleccionado |
| AC-28 | Dirección contradictoria o par original no identificable | Atajo bloqueado con conflicto y acceso a hechos; sin elección por fecha/importe/proximidad ni autocorrección |
| AC-29 | Devolución parcial y después excesiva de par seleccionado | Validación de par/dirección, importe y fecha editables; aviso de exceso; cada recuperación una sola vez en par y global; motor único determina Neto/Exceso/Estado |
| AC-30 | Confirmar apertura con evidencia suficiente desde ficha | Una foto por ID REF+ID Ciclo con importe, Inicio, procedencia, evidencia/auditoría, fecha confirmación y cobertura; sin modificar apertura E2.1 |
| AC-31 | Sugerencia con cobertura/hechos anteriores verificables; cancelar o confirmar | No persiste hasta confirmación explícita; cancelar no crea foto; sin usar pendiente actual automáticamente |
| AC-32 | Falta evidencia, hechos posteriores o hechos de Inicio sin orden verificable | No reconstrucción; exigir evidencia de apertura o mostrar No disponible; no convertir ausencia en cero |
| AC-33 | Cero verificado o neto negativo por exceso histórico justificado | Conservar cero o signo negativo con evidencia/cobertura; sin truncar ni generar movimientos de cuadre |
| AC-34 | Confirmación tardía y devolución posterior | Inicio financiero separado de confirmación; evidencia justifica valor histórico; devolución posterior no cambia foto |
| AC-35 | Confirmaciones concurrentes, replay y consultas repetidas | Un único registro confirmado por REF+Ciclo; GET no escribe; idempotencia y rollback evitan duplicados/parciales |
| AC-36 | Corrección excepcional o cambio de Inicio que afecta foto | Revisión de impacto, motivo, auditoría y protección de cierres/fotos; original trazable; sin segunda foto vigente ni cambio silencioso; si protección no verificable, bloquear confirmación de corrección |

Trazabilidad adicional: AC-27–29 desarrollan E3.1-AC1/2; AC-30–36 desarrollan
E3.1-AC3. Q1–Q8 resueltas; revisión documental independiente realizada y ajustes aplicados.
Spec/wireframes aprobados. Siguiente gate: commit/PR documental y checks; merge
requiere aprobación propia. Dev13 fue autorizado posteriormente y está ahora
suspendido tras B13-1 hasta reanudación expresa; no reanudar en esta ronda. Sin SQL ni Excel.


## Enmienda Q9 — atribución explícita de Transferencias — APPROVED

Fuente conceptual: resolución expresa usuario/Álex 2026-10-25, registrada en
[brainstorming](13-anticipos-brainstorming.md#q9--resolución-conceptual-y-enmienda-pendiente--2026-10-25).
Aprobación de esta enmienda completa: **APPROVED**, usuario 2026-10-25 «Aprobado», respuesta a entrega final PR70/8f58f53. Q1–Q8 conservadas. El rol no se
puede deducir solo de origen/destino/Referencia: esta enmienda reemplaza cualquier
lectura de rev3 que permita usar dirección aislada como acreditación del rol.

### Impacto en datos y motor

- Propuesta de metadatos mínimos `movimiento_anticipo`, relación 0..1 por ID estable
  de Movimiento (FK única). Rol explícito Adelanto/Devolución; IDs de orientación
  del adelanto (origen y destino del par) y Referencia coherentes con el hecho;
  evidencia/procedencia, revisión y auditoría. Un Adelanto declara su orientación;
  una Devolución selecciona un par acreditado de esa REF y usa su inversa.
- No persiste copia de importe ni segundo hecho financiero. El motor único lee
  importe/vigencia de Movimientos y rol/vinculación acreditados de sus metadatos.
  Identidad del par por REF+IDs de origen/destino del adelanto, sin maestro nuevo.
  Validar existencia de adelanto acreditado del par; no elegir por fecha o importe.
- Nueva Transferencia con REF Anticipo exige metadatos válidos. Si falta rol,
  par incompatible o dirección no inversa, rechazar íntegramente. Movimiento,
  metadatos y auditoría se escriben en una transacción con idempotencia/revisión.
- Histórico sin acreditación conserva datos y efecto bancario. No backfill de rol
  por orden/fecha/nombre/importe. Mostrar hechos pendientes de revisión y únicamente
  subtotales acreditados Parciales; global no se presenta completo ni estado
  Recuperado por ausencia/0=0. No disponible cuando no hay base acreditada.
- Acreditación histórica es acción explícita sobre IDs/revisión vigentes, evidencia
  identificable, vista de impacto y confirmación auditada. Solo cambia metadatos;
  no altera silenciosamente fecha/importe/dirección del hecho bancario.
- Rectificación/anulación revalida rol, par, Referencia y dependencias en el mismo
  protocolo de revisión. Si retirar/cambiar un adelanto deja devoluciones sin par
  acreditado, mostrar conflicto e impedir confirmar una atribución incoherente;
  no reasignar a otro par automáticamente. Revisar impacto sobre foto/cierres y
  recalcular el motor. Originales/fotos no se reescriben silenciosamente.
- Propuesta de actualización técnica futura: crear metadatos sin clasificar
  automáticamente históricos, preservar IDs/efecto bancario y tratar su ausencia
  como falta de acreditación. No hay DDL ejecutado ni migración de datos reales.

### Impacto en API y concurrencia

- Extender el contrato del servicio común de Transferencias con rol y orientación/
  par cuando la Referencia es Anticipo. Todas las rutas que crean, rectifican o
  anulan pasan por las mismas validaciones; no basta validar el atajo UI.
- Lecturas de ficha/operaciones devuelven rol acreditado o ausencia con motivo,
  par por IDs, procedencia y cobertura. Importes siempre del hecho canónico.
- Propuesta de acción protegida de acreditación histórica por ID de Movimiento,
  con revisión esperada, rol/par, evidencia y confirmación de impacto. Reutilizar
  servicios/revisión/auditoría; no crear endpoint de movimientos paralelo.
- Idempotencia, validación de revisión y transacción evitan hecho sin metadatos,
  doble recuperación y acreditación sobre hecho obsoleto. Fallo revierte conjunto;
  sesión inválida no escribe; errores no revelan SQL ni evidencia sensible.

### Impacto en UI y wireframes de la enmienda

```text
TRANSFERENCIA · Referencia Anticipo REFxxx
Rol obligatorio: ( ) Adelanto  ( ) Devolución
Adelanto: Origen [ID Saldo] → Destino [ID Saldo] · declarar orientación
Devolución: seleccionar par acreditado [origen/destino e importes verificables]
Dirección propuesta [inversa del par] · Importe [editable] · Fecha [editable]
[Revisar y confirmar] → un Movimiento + metadatos en transacción
Sin par acreditado / conflicto: no confirmar devolución; [Ver motivo]
```

```text
ACREDITAR HISTÓRICO · Movimiento IDxxx · REFxxx · revisión vigente
Hecho original: fecha, importe, origen y destino (sin cambios bancarios)
Rol [Adelanto/Devolución] · Orientación/par [IDs verificables]
Evidencia [identificador] · Procedencia [fuente]
[Revisar impacto] → derivados, pendientes y fotos/cierres afectados
[Confirmar acreditación] [Cancelar]
Sin evidencia: Revisar/No disponible; subtotal acreditado Parcial
```

El atajo de Q6/Q7 precarga rol Devolución, REF e inversa del par seleccionado;
revisión/confirmación obligatorias. Histórico Exterior conserva limitación Q4/Q6.
En 390 campos/tarjetas en columna con etiquetas, foco y errores asociados;
1440 muestra hecho original y revisión sin ocultar cobertura ni evidencia.
La ficha diferencia subtotales acreditados de hechos pendientes de atribución.

### Impacto en pruebas y trazabilidad

Los AC-01–36 permanecen actuales; Q9 modifica precondiciones de AC-05–12,
17–23 y 27–36: roles/par acreditados para positivos, ausencia/conflicto para
negativos. No convierte pruebas actuales en futuras ni acredita ejecución.

| ID | Acción / precondiciones | Resultado esperado |
| --- | --- | --- |
| AC-37 | Crear Transferencia Anticipo por cada ruta soportada sin rol o con rol/par inválido | Rechazo atómico; sin Movimiento o metadatos parciales; mismas reglas que atajo |
| AC-38 | Registrar Adelanto y Devolución con IDs/REF/par coherentes | Un solo hecho por operación, metadatos vinculados a su ID; motor calcula una vez usando importes canónicos |
| AC-39 | Fallo intermedio, replay o escritura concurrente de hecho y metadatos | Rollback o repetición idempotente; sin huérfanos, duplicados ni atribuciones inconsistentes |
| AC-40 | Histórico A→B y B→A sin rol acreditado | No inferir por fecha/importe/nombre; efecto bancario intacto, motor ND/Revisar o subtotal acreditado Parcial |
| AC-41 | Acreditar histórico con evidencia y revisión; cancelar, conflicto o sesión expirada | Solo confirmación válida cambia metadatos/auditoría; hecho bancario intacto; conflicto/expiración/cancelación no escribe |
| AC-42 | Rectificar/anular hecho acreditado o cambiar REF/orientación con recuperaciones dependientes | Revalidar dependencias e impacto; sin reasignación automática, sin doble recuperación ni metadatos obsoletos aceptados como completos |
| AC-43 | Acreditación/rectificación afecta Neto apertura o cierres/fotos | Vista de impacto y protección verificable; no cambiar foto silenciosamente; corrección excepcional conforme Q8 |
| AC-44 | Atajo con único/múltiples pares, vista 390/1440 y acceso por teclado | Rol/REF/inversa precargados y visibles; selección explícita si múltiples, revisión previa; ausencia/conflicto bloquea con motivo |

AC-37–42/44 desarrollan E3.1-AC1/2; AC-43 desarrolla E3.1-AC3 y Q8.
Pruebas funcionales de enmienda: UNRUN; implementación aún no reanudada.

**Gate documental cerrado:** enmienda completa aprobada, incluidos datos, API,
UI/wireframes y AC-37–44. Siguientes gates: aprobación propia de merge PR70 e
instrucción expresa de reanudación dev13 con cuota verificada. Sin migración real
ni despliegue. Dev13 permanece detenido; no se declara implementado ni probado.
