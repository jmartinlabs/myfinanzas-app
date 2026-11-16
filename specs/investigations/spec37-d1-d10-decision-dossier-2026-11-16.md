# SPEC37 — Expediente de decisiones D1–D10 (2026-11-16)

**Estado: análisis de #412. Este expediente no aprueba nada y no autoriza DEV.** Reúne las
diez decisiones de [SPEC37 §17](../37-registro-coordinado-gastos-specification.md#17-decisiones-que-requieren-aprobación)
para que el usuario pueda resolverlas de forma coherente, con la evidencia del código que hoy
existe en `test`. Cada decisión sigue `[PENDIENTE]`; cada recomendación es `[PROPUESTA]` y no
sustituye una decisión explícita e identificable.

- **Base documental:** `test` `65915b2` (2026-11-16). Solo documentación; nada ejecutado.
- **No modifica:** SPEC37 ni SPEC36. El registro de una aprobación corresponde a la spec
  propietaria (SPEC37 §0/§17), no a este expediente.
- **No autoriza:** código, API, SQLite, esquema, migración, datos reales, UI, despliegue ni
  el `Ready Development` de #412.
- **Regla:** el silencio no aprueba. Aprobar en bloque vale solo si el usuario identifica qué
  incluye y qué excluye. Aprobar una recomendación no autoriza desarrollo.

## 1. Cómo leerlo

1. **Una decisión, una respuesta.** Cada `Dn` se aprueba, se corrige o se mantiene pendiente
   con texto, fecha y alcance (criterio de aceptación de #412).
2. **Evidencia no es autorización.** Que el esquema vigente ya contemple una columna no
   aprueba la decisión funcional que la usa; solo demuestra qué coste tiene aprobarla.
3. **Etiquetas de evidencia.** `DEMOSTRADO` = leído en el código de `test`; `DOCUMENTADO` =
   leído en una spec o aprobación registrada; `UNRUN` = no ejecutado.
4. **Lo que hay que decidir hoy** (§7) está separado de lo que depende de un gate ajeno
   (D10 requiere E4.9).

## 2. Evidencia de partida

| Hecho | Dónde | Etiqueta |
| --- | --- | --- |
| SPEC36 está aprobada para desarrollo desde 2026-11-11, con el incremento 1 (mecanismo compartido) autorizado | `specs/36-…-specification.md` §0 | `DOCUMENTADO` |
| El incremento 1 está integrado en `test` (#391 y #399 `MERGED`) y su contrato se declara canónico en SPEC36 §6 | GitHub + `specs/36-…-specification.md` §6 | `DOCUMENTADO` |
| Existe la tabla `transferencia_pendiente` con `origen_tipo IN ('Reparto','RegistroCoordinado')` y tres estados | `apps/api/src/spec36-schema.ts` | `DEMOSTRADO` |
| Para `origen_tipo='RegistroCoordinado'` el esquema exige `gasto` no nulo y `reparto_linea` nulo | `apps/api/src/spec36-schema.ts` (`CHECK`) | `DEMOSTRADO` |
| La columna `anticipo` es `FK` a `fichas_anticipos(referencia)`: solo admite una ficha existente | `apps/api/src/spec36-schema.ts` | `DEMOSTRADO` |
| `gasto` tiene índice **no** único: el esquema admite varios pendientes sobre el mismo Gasto | `apps/api/src/spec36-schema.ts` (`transferencia_pendiente_gasto`) | `DEMOSTRADO` |
| El alta de pendiente solo acepta `lineaId`, `origenOperativo` y `referencia`, y **rechaza** `referencia`; escribe siempre `origen_tipo='Reparto'` | `apps/api/src/transferencias-pendientes.ts` | `DEMOSTRADO` |
| `vincular` exige dirección e importe exactos, rechaza Movimiento anulado, no-Transferencia, ya vinculado y **Transferencia con Referencia** | `apps/api/src/transferencias-pendientes.ts` | `DEMOSTRADO` |
| `conditions()` solo calcula motivos de revisión para el origen `Reparto` y para el Movimiento confirmado: no hay motivos para `RegistroCoordinado` | `apps/api/src/transferencias-pendientes.ts` | `DEMOSTRADO` |
| `writeMovementInTransaction` y `crearTransferenciaPendiente` permiten componer dentro de una transacción; son las **únicas** variantes `InTransaction` del proyecto | `apps/api/src/movimientos.ts` | `DEMOSTRADO` |
| `createAnticipo` crea Referencia y ficha en su propia transacción; no existe variante en transacción | `apps/api/src/anticipos.ts` | `DEMOSTRADO` |
| `validateAnticipo` exige que la ficha de Anticipo exista **antes** de escribir la Transferencia | `apps/api/src/anticipos.ts` | `DEMOSTRADO` |
| E1.4/E1.5 bloquean por fecha futura, salida a Exterior no permitida y uso de `S000`; **no** existe bloqueo por posición calculada insuficiente | `apps/api/src/movimientos.ts` | `DEMOSTRADO` |
| `position()` devuelve `no_aplica` con importe nulo para `Terminal`, `Exterior` y `No controlado`, y `pendiente_motor` para `Inversiones` | `apps/api/src/saldos.ts` | `DEMOSTRADO` |
| `precierre.ts` calcula `bloqueos` y `e4_9Bloqueado` sin leer `transferencia_pendiente` | `apps/api/src/precierre.ts` | `DEMOSTRADO` |
| E4.8 aprobada y en solo lectura; E4.9 aprobada sin DEV autorizado (AC `UNRUN`) | `specs/26-…`, `specs/27-…` | `DOCUMENTADO` |
| Nada de SPEC37 está implementado: no hay ruta de operación coordinada, ni alta `RegistroCoordinado`, ni UI de modalidades | `apps/api/src/app.ts` | `DEMOSTRADO` |

## 3. Resumen

| # | Tema | Naturaleza | Recomendación | Coste técnico si se aprueba |
| --- | --- | --- | --- | --- |
| D1 | Mecanismo compartido | Confirmación por referencia | Aprobar tal cual | Ninguno: se extiende el registro existente |
| D2 | Alta de Referencia/ficha de Anticipo | Funcional + técnica | Aprobar; exige referencia prevista persistida y alta de ficha en transacción | Esquema v30 (1 columna) + variante en transacción |
| D3 | «Máximo permitido» de la barra | Funcional | Aprobar: informativo, sin bloqueo nuevo | Ninguno |
| D4 | Gasto real con financiación pendiente | Funcional | Aprobar tal cual | Ninguno: el esquema ya lo exige |
| D5 | Vinculación de Transferencia existente | Funcional + técnica | Aprobar; la igualdad de Referencia en B exige ampliar `vincular` solo para `RegistroCoordinado` | Ajuste acotado en el flujo de vinculación |
| D6 | Gasto anulado con pendiente | Funcional | Aprobar; bloqueo por condición, sin cuarto estado | Motivos de revisión nuevos |
| D7 | Entidad de operación compuesta | Técnica | Aprobar: sin entidad; una clave de intento para la operación | Esquema v30 (1 tabla de intentos) |
| D8 | Terminales | Funcional | Aprobar tal cual | Ninguno |
| D9 | Referencias Viaje/Evento | Alcance | Aprobar: no habilitarlas | Ninguno |
| D10 | Precierre y pendientes | Funcional, gate ajeno | Aprobar «avisar, no incluir en la foto, no bloquear» | Aviso en E4.8 (spec propietaria) |

## 4. Decisiones

### D1 — Lectura de E2.3 y del mecanismo compartido

- **Texto propuesto:** `[CONFIRMADO]` SPEC37 consume SPEC36 §6 como pieza única; no crea
  registro, estados, alerta ni confirmación paralela. El gate «Aprobación de SPEC36 §6» se
  entiende cumplido por la aprobación del 2026-11-11.
- **Evidencia:** SPEC36 §6 declara el mecanismo canónico para ambos flujos (`DOCUMENTADO`);
  la tabla y el servicio existen en `test` (`DEMOSTRADO`).
- **Alternativa descartada:** dejar D1 abierta «a la espera de aprobar SPEC36 §6». La
  aprobación ya existe; mantenerla abierta obligaría a repetir un gate cerrado.
- **Riesgo:** ninguno funcional. El riesgo real es leer D1 como aprobación de SPEC37 completa:
  no lo es.
- **Efecto:** ninguno sobre los 41 AC. Fija que el DEV extiende `transferencia_pendiente`.

### D2 — Momento de alta de Referencia y ficha de Anticipo

- **Texto propuesto:** la Referencia y la ficha de Anticipo se crean **solo al confirmar** la
  Transferencia; el pendiente guarda la referencia **prevista**, sin ficha, sin Adelantado, sin
  Recuperado y sin Neto (AC-32).
- **Evidencia en contra de la letra actual:** la columna `anticipo` es `FK` a una ficha
  existente (`DEMOSTRADO`), así que un pendiente no puede guardar hoy una referencia que aún
  no existe; el alta rechaza `referencia` (`DEMOSTRADO`); y `validateAnticipo` exige la ficha
  antes de escribir la Transferencia (`DEMOSTRADO`). Sin una referencia prevista persistida,
  AC-39 («la Referencia deja de ser elegible antes de confirmar») no se puede detectar.
- **Recomendación:** aprobar D2 y aceptar que su cumplimiento exige, en el DEV autorizado,
  una columna `anticipo_previsto` validada por formato y revalidada al confirmar, más una
  variante en transacción del alta de ficha. No se crea ninguna entidad nueva.
- **Alternativa descartada:** no guardar la referencia prevista y obligar a elegirla en la
  confirmación. Ahorra una columna, pero rompe §7 y AC-39 y permite confirmar contra una
  Referencia distinta de la prevista sin aviso. Se descarta salvo que el usuario prefiera ese
  recorte funcional explícito.
- **Riesgo:** aprobar D2 sin asumir el coste deja el DEV bloqueado entre §7 y el esquema.
- **Efecto:** §7, AC-09, AC-10, AC-32 y AC-39.

### D3 — «Máximo permitido» de la barra

- **Texto propuesto:** el máximo de la barra y el «disponible posterior estimado» son
  **informativos**. No se añade ningún bloqueo por posición calculada: solo bloquean las
  reglas vigentes de E1.4/E1.5. Un déficit calculado es información, no una prohibición.
- **Evidencia:** hoy no existe bloqueo por saldo calculado (`DEMOSTRADO`); las validaciones
  que rechazan son fecha futura, salida a Exterior y `S000` (`DEMOSTRADO`). AC-17 ya recoge
  esta lectura.
- **Alternativa descartada:** bloquear cuando la Transferencia no cubre el déficit. Añadiría
  una regla financiera nueva no aprobada y rompería el caso legítimo de remanente parcial.
- **Riesgo:** que la UI presente el déficit como prohibición. Debe etiquetarse como
  informativo y nunca mostrar 0 donde no hay posición.
- **Efecto:** §6, AC-04, AC-05 y AC-17.

### D4 — Gasto real con financiación pendiente

- **Texto propuesto:** el Gasto se registra siempre como hecho real e íntegro desde el Saldo
  pagador. Un pendiente no aporta liquidez, no altera Saldos, Presupuestos ni Anticipos y no
  exime de ninguna validación vigente.
- **Evidencia:** el esquema ya obliga a que un pendiente `RegistroCoordinado` tenga Gasto
  (`DEMOSTRADO`) y el servicio declara que el pendiente no mueve dinero ni liquidez
  (`DEMOSTRADO`).
- **Alternativa descartada:** un «Gasto pendiente» que se materialice al confirmar la
  Transferencia. Está excluido por SPEC37 §1 y §14 y convertiría una previsión en hecho.
- **Riesgo:** presentar el pendiente como si la financiación ya existiera. Se resuelve con
  etiqueta explícita y con las tres superficies de AC-38.
- **Efecto:** §3, §4, AC-26 y AC-34.

### D5 — Vinculación de una Transferencia existente

- **Texto propuesto:** vincular exige coincidencia **exacta** de dirección e importe y, en
  modalidad B, de Referencia. Si algo no coincide, se cancela el pendiente con motivo y se usa
  el procedimiento ordinario; nunca se ajusta el hecho ni se crea un Movimiento sustitutivo.
- **Evidencia:** `vincular` ya aplica dirección e importe exactos y rechaza un Movimiento
  anulado o ya vinculado (`DEMOSTRADO`); **hoy rechaza también toda Transferencia con
  Referencia** (`DEMOSTRADO`), lo que deja fuera la modalidad B.
- **Recomendación:** aprobar; el DEV debe admitir Transferencia con Referencia **solo** cuando
  `origen_tipo='RegistroCoordinado'` y la Referencia coincida exactamente, manteniendo intacto
  el comportamiento del origen `Reparto`.
- **Alternativa descartada:** relajar la restricción para todos los orígenes: cambiaría el
  comportamiento ya aprobado del reparto mensual.
- **Riesgo:** tocar un servicio compartido por dos flujos. La condición debe ser por
  `origen_tipo` y cubrirse con una prueba de no regresión del flujo de Reparto.
- **Efecto:** §9.1, AC-31.

### D6 — Gasto anulado o modificado con pendiente

- **Texto propuesto:** si el Gasto vinculado cambia de importe, fecha, Partida, Saldo pagador o
  modalidad, o se anula, el pendiente pasa a «Requiere revisión» con motivo y la confirmación
  queda bloqueada. El usuario decide entre cancelar con motivo o vincular otro Gasto real.
  Nunca hay confirmación automática ni contra un Gasto anulado.
- **Evidencia:** «Requiere revisión» ya es una **condición** calculada, no un estado
  (`DOCUMENTADO` en SPEC36 §6.3, `DEMOSTRADO` en `conditions()`); hoy no existe ningún motivo
  para `RegistroCoordinado` (`DEMOSTRADO`), por lo que la regla es una extensión real.
- **Recomendación:** aprobar. Motivos nuevos: `GASTO_ANULADO`, `GASTO_NO_COINCIDE` y
  `REFERENCIA_NO_ELEGIBLE`. Re-vincular un pendiente ya confirmado sigue sin ser posible
  (`vincular` exige estado `Pendiente de realizar`), lo que es coherente.
- **Alternativa descartada:** cancelar el pendiente en cascada al anular el Gasto. Elimina
  trazabilidad y decide por el usuario.
- **Riesgo:** el índice sobre `gasto` no es único y el esquema admite varios pendientes sobre
  el mismo Gasto. No hace falta unicidad para AC-30; si el usuario la quisiera, sería un
  cambio de esquema adicional.
- **Efecto:** §9.2, AC-23 y AC-30.

### D7 — Entidad de operación compuesta

- **Texto propuesto:** no se crea entidad de operación compuesta. La operación coordinada usa
  una clave de intento propia, la auditoría de los hechos existentes y los vínculos
  (`gasto`, `anticipo`, `movimiento`) como trazabilidad.
- **Evidencia:** los dos hechos se pueden componer en una transacción
  (`writeMovementInTransaction`, `crearTransferenciaPendiente`), pero **ninguna** tabla de
  intentos cubre hoy dos escrituras con una sola clave: `movement_attempts` es por Gasto y
  `transferencia_pendiente_attempts` es por operación del pendiente (`DEMOSTRADO`).
- **Recomendación:** aprobar D7 y asumir una única tabla de intentos de la operación
  coordinada en el v30, con el patrón vigente (clave, huella de payload, respuesta, caducidad).
  No es una entidad de negocio: no tiene estados ni se relaciona con nada más.
- **Alternativa descartada:** reutilizar `transferencia_pendiente_attempts` con una
  pseudo-operación. Deja esa tabla atada semánticamente a un flujo que no siempre crea
  pendiente (modalidad A con Transferencia realizada) y confunde su lectura.
- **Riesgo:** sin registro de intento, AC-40 (reintento tras error de red) no se puede cumplir
  sin duplicar el Gasto.
- **Efecto:** §4, AC-20, AC-21 y AC-40.

### D8 — Saldos terminales

- **Texto propuesto:** en un Saldo terminal no se calculan posición, déficit, mínimo ni máximo.
  El importe se introduce manualmente y solo bloquean las validaciones vigentes (salida a
  Exterior, fecha no futura). Si el otro extremo tiene posición calculable, sus comprobaciones
  se mantienen.
- **Evidencia:** `position()` devuelve `no_aplica` con importe nulo para `Terminal`
  (`DEMOSTRADO`) y no existe bloqueo por insuficiencia (`DEMOSTRADO`).
- **Alternativa descartada:** tratar el terminal con posición 0. Mostraría un déficit falso y
  prohibiría operaciones reales.
- **Riesgo:** que la barra sugiera un máximo inexistente. Debe ocultarse el máximo y conservar
  el campo exacto editable.
- **Efecto:** §6, §12, AC-25.

### D9 — Referencias Viaje/Evento en el flujo

- **Texto propuesto:** en esta mejora solo se admite Referencia de tipo **Anticipo** en la
  modalidad B. Viaje y Evento no se habilitan en el flujo coordinado.
- **Evidencia:** los cinco tipos están disponibles en el catálogo (`DEMOSTRADO`) y SPEC05
  limita los selectores operativos a Viaje/Evento, con ficha obligatoria para los tipos E3
  (`DOCUMENTADO`); habilitarlos aquí crearía un tercer modo de financiación sin contrato.
- **Alternativa descartada:** admitir Viaje/Evento como Referencia informativa de la
  Transferencia ordinaria. Añade semántica de caso a una Transferencia interna sin efectos
  definidos.
- **Riesgo:** bajo; es un recorte de alcance. Una ampliación futura es otra spec.
- **Efecto:** AC-09 a AC-13 se limitan a Anticipo.

### D10 — Precierre y pendientes

- **Texto propuesto:** un pendiente **no** forma parte de la fotografía histórica ni de ningún
  cierre, porque no es un hecho. El precierre lo **avisa** y el cierre **no se bloquea** por su
  existencia; el pendiente conserva su estado y se resuelve cuando el usuario lo decida.
- **Evidencia:** `precierre.ts` ignora hoy `transferencia_pendiente` (`DEMOSTRADO`); E4.8 está
  aprobada y en solo lectura y E4.9 no tiene DEV autorizado (`DOCUMENTADO`). SPEC36 §6.4 ya
  fija que un pendiente nunca aporta fondos ni exime de una validación.
- **Alternativa descartada:** bloquear el cierre mientras existan pendientes. Convertiría una
  intención en requisito de cierre y cambiaría reglas de SPEC26/SPEC27, que no son objeto de
  esta Issue.
- **Riesgo:** la decisión «avisar» necesita un criterio observable propio; añadirlo es modificar
  SPEC37, no esta fase. El aviso se implementa en la spec propietaria del precierre.
- **Efecto:** §17 D10; sin AC asociado hoy. Acoplamiento con E4.8/E4.9, no con E1.4/E1.5/E3.1.

## 5. Consecuencias técnicas detectadas

No son decisiones nuevas ni autorizan nada: son el coste medido de aprobar lo anterior, y deben
quedar visibles antes del `Ready Development`.

1. **Referencia prevista (D2):** `anticipo` es `FK` a ficha existente; hace falta una columna
   `anticipo_previsto` o equivalente.
2. **Alta de ficha en transacción (D2):** `createAnticipo` abre su propia transacción y no hay
   variante `InTransaction`; la operación coordinada de modalidad B no puede ser atómica hoy.
3. **`ciclo_origen` obligatorio:** el pendiente exige un Ciclo; en el flujo de Gasto hay que
   definir si es el del Gasto o el de la fecha prevista. Es una decisión de implementación que
   no cambia ningún importe, pero debe quedar escrita antes del DEV.
4. **Sin unicidad sobre `gasto`:** el esquema admite varios pendientes sobre el mismo Gasto.
5. **Motivos de revisión ausentes (D6):** `conditions()` no tiene rama `RegistroCoordinado`.
6. **Ampliación de `vincular` (D5):** la admisión de Referencia debe ser condicional por
   `origen_tipo` para no alterar el flujo de Reparto.
7. **Intento de la operación (D7):** hace falta una tabla de intentos para la clave compuesta.

## 6. Frontera con el mecanismo compartido y las reglas vigentes

| Materia | Propietario | SPEC37 | Qué no puede hacer el DEV |
| --- | --- | --- | --- |
| Transferencia pendiente (registro, estados, alerta, confirmación) | SPEC36 §6 | Consume la pieza única | Crear tabla, estado, alerta o confirmación propias |
| Gasto real, Partida, fecha no futura, salida a Exterior | SPEC04 (E1.4) | Reutiliza validaciones | Añadir o relajar validaciones del motor |
| Transferencia interna real, dos Saldos, sin `S000`/Exterior | SPEC05 (E1.5) | Reutiliza el único escritor | Escribir Transferencias por otra vía |
| Anticipo: Referencia, ficha, Adelantado/Recuperado/Neto | SPEC13 (E3.1) | Nace solo de la Transferencia real confirmada | Generar ficha o métricas desde un pendiente |
| Bandeja de pendientes | SPEC21 (E3.6) | Consumidor de solo lectura | Persistir desde la bandeja |
| Cierres y fotografía | SPEC27 (E4.9) | No incluye pendientes en la foto (D10) | Cambiar reglas de cierre |

## 7. Orden de aprobación recomendado

- **Bloque funcional, decidible hoy:** D1, D3, D4, D5, D6, D8 y D9. No dependen de ningún gate
  abierto; su aprobación fija el comportamiento y sus AC ya existen.
- **Bloque técnico, decidible hoy:** D7 y la parte técnica de D2. Condicionan el esquema v30 y
  la atomicidad; aprobarlos con D2 evita reabrir la decisión en mitad del DEV.
- **Bloque condicionado:** D10. La parte «avisar y no incluir en la foto» es decidible hoy; la
  parte «¿además bloquea?» afecta a SPEC26/SPEC27 y a E4.9, que no tienen DEV autorizado.
- **Paquete mínimo para un futuro `Ready Development`:** D1–D9 aprobadas y D10 en modo aviso.
  Cualquier otra combinación deja AC sin contrato ejecutable.

## 8. Registro de la respuesta

La aprobación se inscribe en la spec propietaria, no aquí:

1. Un **registro de aprobación** en SPEC37 (nuevo §0, como SPEC36) con fecha, responsable,
   texto de la aprobación y precisiones.
2. El cambio de marca de cada `Dn` en §17 y de las secciones afectadas.
3. El `Status` de SPEC37 y el `Status` del Project los mueve el usuario; este expediente no los
   toca.

Plantilla por decisión: `Dn · APROBADA/CORREGIDA/PENDIENTE · fecha · usuario · texto · alcance ·
exclusiones · efecto sobre AC`.

## 9. Próximo gate

Revisión del usuario de D1–D10 con este expediente delante. Aprobarlas **no** autoriza
desarrollo: SPEC37 sigue en `DRAFT` y el `Ready Development` es un gate separado del usuario.