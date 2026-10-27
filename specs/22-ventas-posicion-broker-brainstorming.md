# 22 — E4.2 Ventas, posición y efectivo de bróker: Brainstorming

Status: **DRAFT — propuesta rev2.1; D1–D7 confirmadas A (2026-10-27); wireframes rev3 y
specification completa aprobados (2026-10-28); testplan pendiente de aprobación explícita;
coordinación D7/SPEC19 (E4.1 integrada).**
Roadmap/context: [roadmap E4.2](roadmap.md), [referencia funcional R5](functional-reference-v5.11.md),
[SPEC19 E4.1](19-instrumentos-compras-inversion-specification.md) y
[testplan E4.1](19-instrumentos-compras-inversion-testplan.md).
Next action: registrar la aprobación de la specification, aprobar el testplan y preparar D7/SPEC19; no iniciar DEV22.

## 0. Estado de las fuentes y límites de esta ronda

- **Contrato funcional de partida:** SPEC19 rev7/rev8, aprobadas por el usuario el 2026-10-26
  sobre `47f469a902330ac199c910225563f909bd5116eb` y
  `f439010d527ba65953a1ccc0aa47cbeb51cfce31`, respectivamente. Rev8 mantiene las decisiones
  funcionales de rev7 y solo ajusta el contrato técnico de esquema.
- **Q0 resuelta — SPEC19 rev10 aprobada e integrada:** el usuario confirma la aprobación de
  SPEC19 rev10 y su testplan el 2026-10-27. El registro original está en el commit
  `3c271d376c4fe1acdd6001c325cf0982eebe7172` (`3c271d3`, «docs(spec19): record rev10 approval
  and C16/C17 freeze»), posterior a `27c8d07c019209b4e0aab16de0fbec1613193cb7` (`27c8d07`);
  el contenido quedó integrado en `main` mediante el squash `156a50d` (`schemaVersion = 18`).
  **No se reabre la aprobación ni se modifica SPEC19.** E4.2 usa el contrato funcional
  rev7/rev8 y el detalle técnico de rev10 como referencia aprobada, sin reservar su versión.
- **E4.1 integrada.** `156a50d` en `main` (v18), QA independiente PASS 48/6 y CI Linux
  295 API / 13 E2E. La tarea `E4.1-OWNERSHIP-C16C17` queda cumplida con C16/C17 congelados;
  esta spec no reabre E4.1 ni cambia sus decisiones.
- **Sin versión de esquema para E4.2.** Esta ronda no reserva ninguna versión. La ampliación
  lógica de `operaciones_inversion` para `Venta` se resolverá en DEV conforme al gate de esquema
  vigente (v18); no se elige aquí 18, 19 ni ninguna otra.
- **Sin desarrollo:** esta ronda solo produce documentos y preguntas. No hay SQL, migraciones,
  pruebas ejecutables, datos reales, PR, merge ni despliegue.

## 1. Decisiones ya fijadas por las fuentes (no reabrir)

| ID | Decisión | Fuente | Consecuencia para E4.2 |
| --- | --- | --- | --- |
| F1 | Compras y Ventas viven exclusivamente en el registro de inversión; nunca son Gasto/Compra ni un tipo nuevo de Movimiento | R2/R5, E4.1-AC1, roadmap E4.2 | Una Venta no crea Movimiento, no ejecuta Presupuesto y no duplica el cobro en Movimientos. |
| F2 | Cada operación conserva Saldo de efectivo, Saldo de inversión, Instrumento, cantidad, precio en divisa, divisa, cambio histórico cuando no es EUR, EUR realmente cargado/cobrado y comisiones incluidas cuando corresponda | R5, E4.1-AC3 | La Venta conserva el EUR efectivamente cobrado y su factor histórico; el cambio actual no recalcula el hecho. |
| F3 | Efectivo del bróker = apertura + entradas − salidas − Compras + Ventas | R5, E1.1, E4.1 §4.3 | La Venta suma una sola vez al efectivo; el motor es único y no se agrega con la posición. |
| F4 | Posición = Saldo de inversión + Instrumento; cantidad = Compras − Ventas | R5, E4.1 §4.4 | La Venta resta cantidad; no hay lote, FIFO ni posición editable. |
| F5 | La posición y el efectivo son derivados; no se persiste una fila editable de posición ni un efectivo almacenado | R5, E4.1 §4.4/§5 | Venta, rectificación y anulación recalculan desde hechos vigentes. |
| F6 | Referencia temporal = máximo de fechas de Movimientos, Revisión Comida y operaciones de inversión, con cobertura explícita; nunca reloj, `creado` ni fecha de auditoría | R3, E1.3 §«Referencia» | Las fechas de Compras y Ventas alimentan la fuente «Operaciones de inversión»; E4.2-AC3. |
| F7 | Precisión DT2: cantidad hasta 8 decimales, precio y cambio hasta 6, EUR en céntimos exactos, cálculo interno exacto y límites de entrada 2⁵³−1 | DT2, E4.1 §6 | La Venta reutiliza las mismas escalas, límites y rechazo sin redondeo. |
| F8 | Fechas civiles `YYYY-MM-DD`, sin huso; «no futura» con el día civil `Europe/Madrid`; agregación de hechos del mismo día a fin de día | DT2, E4.1 §6/§11 | La Venta usa la misma fecha civil y la misma convención de fin de día. |
| F9 | Rectificación con reemplazo completo, `revision` vigente, `motivo`, vista de impacto, auditoría atómica; anulación conserva el registro y lo excluye de cálculos; sin DELETE | E4.1 §4.5/§8 | La Venta reutiliza el mismo contrato de corrección y anulación. |
| F10 | Valoración, resultado, rentabilidad y estado Abierta/Cerrada pertenecen a E4.3 | R5, roadmap E4.3, E4.1 §12 | E4.2 no calcula valor actual, resultado ni rentabilidad; una venta total deja cantidad 0 sin etiquetar «Cerrada». |
| F11 | No se inventan reglas de posiciones negativas | Roadmap E4.2, «Fuera» | D1 es una decisión material confirmada A el 2026-10-27; no se reabre. |
| F12 | Los datos de ejemplo son ficticios y deterministas; sin Excel, datos personales ni importación | P6/P7, E4.1 §12 | Los fixtures usan `S003`, `S004`, `S006` e `I1001` ficticios. |

## 2. Decisiones propuestas para E4.2 (requieren respuesta del usuario)

Las opciones marcadas `[x]` son **propuestas**, no respuestas confirmadas. La specification
adopta provisionalmente la recomendación para poder revisar un contrato completo; la
aprobación de la spec incluye la confirmación expresa de estas decisiones.

### D1 — Venta superior a la cantidad disponible

Question: ¿Qué debe ocurrir si una Venta intenta vender más cantidad de la que la posición
`Saldo de inversión + Instrumento` tiene a esa fecha, incluida una venta retroactiva que deje
negativa una fecha posterior?

- [x] **Recomendado: rechazar con 422 `INSUFFICIENT_UNITS` y no escribir.** Se comprueba la
  cantidad corriente desde la fecha de la Venta hasta los hechos posteriores, con agregación de
  fin de día; el error devuelve `disponible`, `necesario`, `minimo`, `fecha`, `saldoInversion` e
  `instrumento`. Evita inventar una regla de posición negativa y conserva la invariante de que
  la cantidad mostrada es un hecho no negativo. — Coherente con el «Fuera» del roadmap y con la
  validación de suficiencia de efectivo de E4.1.
- [ ] **Alternativa: permitir cantidad negativa y mostrarla como incidencia.** Requiere definir
  qué significa una posición negativa, cómo se corrige y cómo la consume E4.3; el roadmap lo
  excluye expresamente de E4.2. — Trade-off: permite registrar una venta descubierta, pero
  inventa una regla financiera no aprobada.

Confirmed answer: **A**; source/date: usuario, 2026-10-27.

### D2 — Efectivo negativo al rectificar o anular una Venta

Question: Una Venta aumenta el efectivo. Si se rectifica a un EUR cobrado menor, se mueve su
fecha o se anula, el efectivo puede quedar negativo en alguna fecha posterior. ¿Se aplica la
misma invariante de «sin efectivo negativo» que E4.1 exige para Compras?

- [x] **Recomendado: aplicar la misma comprobación de suficiencia de efectivo a la
  rectificación y anulación de Ventas.** Si el efectivo resultante es negativo en cualquier
  fecha desde la menor fecha implicada, se rechaza con 422 `INSUFFICIENT_CASH`, sin escritura,
  con `disponible`, `necesario`, `minimo` y `fecha`. Mantiene una sola invariante para todos los
  hechos del bróker y evita que una corrección convierta en negativo un saldo que el sistema
  protegía. — Trade-off: una anulación legítima puede bloquearse hasta corregir el gasto que
  consumió ese efectivo.
- [ ] **Alternativa: permitir efectivo negativo tras una corrección o anulación y mostrarlo como
  incidencia.** No bloquea la corrección, pero rompe la uniformidad con E4.1 y exige definir el
  estado negativo, su alerta y su tratamiento en Liquidez y E4.3. — Trade-off: más flexibilidad
  correctiva, menos protección de integridad.

Confirmed answer: **A**; source/date: usuario, 2026-10-27.

### D3 — Instrumento o Saldo inactivo

Question: ¿Puede venderse un Instrumento inactivo o desde un Saldo inactivo para liquidar una
posición existente?

- [x] **Recomendado: permitir la Venta de un Instrumento inactivo si tiene cantidad disponible,
  mostrando «Instrumento inactivo» y sin ofrecerlo para nuevas Compras; bloquear la Venta desde
  un Saldo inactivo y pedir reactivarlo primero.** Permite liquidar un activo que ya no se
  compra, sin reabrir un Saldo cerrado. — Trade-off: dos reglas distintas para dos estados de
  catálogo.
- [ ] **Alternativa: bloquear ambos hasta reactivar.** Más simple y uniforme con «inactivo no
  seleccionable», pero impide liquidar una posición sin reabrir el Saldo o el Instrumento.
- [ ] **Alternativa: permitir ambos con aviso.** Máxima flexibilidad, pero un Saldo inactivo
  vuelve a recibir efectivo y deja de ser una cuenta cerrada a efectos prácticos.

Confirmed answer: **A**; source/date: usuario, 2026-10-27.

### D4 — Navegación del módulo Inversiones

Question: ¿Cómo se consultan y registran Compras y Ventas sin reescribir los wireframes
aprobados de E4.1?

- [x] **Recomendado: conservar las pestañas aprobadas «Instrumentos» y «Compras» y añadir una
  pestaña «Ventas» con su listado, alta, impacto, rectificación y anulación.** La ficha del
  Instrumento muestra posiciones y las dos secciones de historial. — Trade-off: una pestaña más,
  pero no se reabren W7/W8 ni se mezclan dos flujos en una sola tabla.
- [ ] **Alternativa: sustituir «Compras» por una pestaña «Operaciones» con filtro
  Compra/Venta.** Menos pestañas y una historia combinada, pero modifica el wireframe aprobado
  de E4.1 y exige migrar la navegación existente.

Confirmed answer: **A**; source/date: usuario, 2026-10-27.

### D5 — Posición con cantidad cero tras una venta total

Question: Después de vender toda la posición, ¿la ficha debe seguir mostrando la fila
`Saldo de inversión + Instrumento` con cantidad 0 y su historial, o debe ocultarla?

- [x] **Recomendado: mantener la fila con cantidad 0, compras/ventas y última operación,
  declarando «Sin valoración hasta E4.3» y sin etiquetar «Cerrada».** Conserva la trazabilidad
  de que hubo posición y permite que E4.3 decida el estado Abierta/Cerrada. — Trade-off: una
  fila más en la ficha.
- [ ] **Alternativa: ocultar la fila cuando la cantidad sea 0 y dejar solo el historial de
  operaciones.** Ficha más limpia, pero pierde la vista agregada de la posición cerrada y
  dificulta la transición a E4.3.

Confirmed answer: **A**; source/date: usuario, 2026-10-27.

### D6 — Operaciones anuladas y fechas en la referencia temporal

Question: ¿Las fechas de operaciones anuladas deben alimentar la referencia temporal compartida?

- [x] **Recomendado: no. Solo cuentan las operaciones vigentes (Compra/Venta) y la fecha
  vigente de una operación rectificada.** Es coherente con que una operación anulada no computa
  en efectivo ni cantidad y con que la referencia es un máximo de hechos económicos
  disponibles; una operación anulada no es un hecho vigente. — Trade-off: si se anula la
  operación más reciente, la referencia puede retroceder, lo cual es correcto al desaparecer el
  hecho.
- [ ] **Alternativa: incluir también las fechas de operaciones anuladas.** Conserva una huella
  temporal de que existió un registro, pero puede mantener una referencia que ya no corresponde
  a ningún hecho vigente y contradice el tratamiento de anulación de E4.1.

Confirmed answer: **A**; source/date: usuario, 2026-10-27.

### D7 — Compra rectificada a la baja o anulada por debajo de la cantidad vendida

Question: Si ya existen Ventas, ¿qué ocurre si se rectifica a la baja o se anula una Compra y la
posición resultante queda negativa en alguna fecha?

- [x] **Recomendado: rechazar con 422 `INSUFFICIENT_UNITS`, sin escritura, aplicando la misma
  comprobación de cantidad de D1 desde la fecha de la Compra afectada.** Es la contrapartida
  necesaria de D1: si la Venta no puede dejar cantidad negativa, una corrección de Compra
  tampoco. — Trade-off: extiende el contrato aprobado de E4.1, que no comprobaba unidades al
  rectificar/anular Compras; requiere una enmienda aprobada de SPEC19 o una decisión expresa del
  owner registrada en su documento canónico.
- [ ] **Alternativa: permitir la cantidad negativa como incidencia.** Evita bloquear la
  corrección, pero introduce la regla de posición negativa que el roadmap excluye y exige
  definir su tratamiento en efectivo, posición y E4.3.

Confirmed answer: **A**; source/date: usuario, 2026-10-27.

## 2.1 Ronda 2 — Confirmaciones del usuario (2026-10-27)

El usuario revisó el handoff de SPEC22 y aprobó las siguientes opciones. **No se reabren** salvo
contradicción material documentada.

| ID | Respuesta confirmada | Efecto |
| --- | --- | --- |
| Q0 | SPEC19 rev10 aprobada el 2026-10-27 e integrada en `main` `156a50d` (registro original `3c271d3`) | Se elimina la discrepancia; no se modifica SPEC19 ni se reabre la aprobación. |
| D1 | **A** — rechazar Ventas con cantidad insuficiente | 422 `INSUFFICIENT_UNITS`, comprobación con ventana posterior, sin escritura. |
| D2 | **A** — preservar efectivo no negativo al rectificar/anular Ventas | 422 `INSUFFICIENT_CASH` si la corrección deja negativo; sin escritura. |
| D3 | **A** — permitir liquidar Instrumentos inactivos con posición disponible; exigir Saldo activo | Instrumento inactivo con cantidad se ofrece con aviso; Saldo inactivo se rechaza hasta reactivar. |
| D4 | **A** — mantener Instrumentos/Compras y añadir Ventas | W11–W16 añaden la pestaña Ventas; W1–W10 no se reabren. |
| D5 | **A** — conservar posiciones con cantidad cero e histórico | Fila con 0, conteos e historial; sin etiqueta «Cerrada» ni valoración. |
| D6 | **A** — solo operaciones vigentes para la referencia temporal operativa | La auditoría conserva las anuladas; la referencia no las usa. |
| D7 | **A** — rechazar rectificaciones de Compras que dejen cantidad vendida sin respaldo | 422 `INSUFFICIENT_UNITS`; coordinar y documentar previamente cualquier cambio necesario en SPEC19. |

**Aprobado visualmente:** W11–W16 y la ampliación W2/W5 rev3, incluidas las variantes de
estados y los bloqueos D1/D2/D3, por mensaje explícito del usuario el 2026-10-28: «Apruebo la
revisión visual rev3 de W2/W5 y W11–W16 de SPEC22, incluidos los estados y bloqueos D1/D2/D3.»
La aprobación visual no autoriza DEV22, esquema, commits, push, PR ni merge.

**Pendiente:** aprobación explícita del testplan y coordinación D7/SPEC19 (enmienda mínima de
SPEC19; E4.1 integrada en v18).

## 3. Cobertura de la ronda

- **Funcional:** Venta en EUR y divisa, parcial/total, comisión incluida, corrección y
  anulación, posición por Saldo+Instrumento, efectivo del bróker y referencia temporal.
- **Pantallas/interacciones:** pestaña Ventas, alta, impacto, rectificación y anulación;
  ficha del Instrumento con posiciones e historial; estados vacío/carga/error; 390 y 1440;
  teclado, foco y ausencia de overflow.
- **Datos leídos/escritos:** `operaciones_inversion` (misma tabla, `clase` Compra/Venta),
  `operacion_inversion_audit`, contadores e intentos; lectura derivada de efectivo y posición;
  ninguna tabla `ventas` paralela.
- **APIs/dependencias:** `/api/ventas`, impacto, rectificación, anulación y auditoría; motor
  único de efectivo; contrato `financialReference`; sin cotizaciones, bancos ni servicios
  externos.
- **Validación/errores:** cantidad, precio, divisa, cambio, EUR, comisión, fecha, Instrumento,
  Saldos, revisión, idempotencia, concurrencia, suficiencia de unidades y de efectivo, estados
  de fuente y seguridad.
- **Fuera:** valoración, resultado, rentabilidad, estado Abierta/Cerrada, lotes/FIFO,
  dividendos, splits, fiscalidad, importación y cierre (E4.3/E4.5/E4.8–E4.11).

## 4. Wireframes

Se proponen W11–W16 en la specification: listado de Ventas (1440/390), alta de Venta
(1440/390) e impacto/rectificación/anulación (1440/390), además de la extensión de la ficha
W2/W5. No se reabren W1–W10 de E4.1. La aprobación visual rev3 fue registrada el 2026-10-28; es
independiente de la aprobación documental de la specification y no autoriza DEV.

## 5. Clarificaciones append-only

- **2026-10-27 — rev1:** se registra la discrepancia de aprobación de SPEC19 rev10 descrita en
  §0. No se modifica SPEC19 ni se reabren sus decisiones funcionales. Se añaden D1–D7 como
  propuestas; ninguna está confirmada.
- **2026-10-27 — rev2:** Q0 resuelta con la aprobación registrada en `3c271d3` (posterior a
  `27c8d07`); D1–D7 confirmadas **A** por el usuario. La base `064df64` es anterior a la
  aprobación y no se modifica. Wireframes W11–W16 y W2/W5 siguen pendientes de aprobación; no
  se inicia DEV22.
- **2026-10-28 — rev3:** wireframes W2/W5 y W11–W16 rev3 aprobados visualmente por el usuario,
  incluidos estados y bloqueos D1/D2/D3. E4.1 queda integrada en `main` `156a50d` (v18); la
  specification completa se aprueba el 2026-10-28 y el testplan queda pendiente. D7/SPEC19 sigue
  abierto; no se inicia DEV22.
