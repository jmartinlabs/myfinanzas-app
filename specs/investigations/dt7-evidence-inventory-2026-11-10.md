# DT7 — Inventario de evidencias para M1, M2, M5 y M8 (2026-11-10)

Hoja accionable: [DT7 · decisiones y revisión privada](dt7-decision-sheet-2026-11-10.md).
**Estado:** `[BORRADOR DE PREPARACIÓN]` — **DT7 NO CERRADO. NINGÚN AC EN PASS. NINGUNA
DECISIÓN APROBADA.** Este documento describe qué evidencia exacta falta para las cuatro
decisiones de evidencia real, cómo se verificará y qué decide el usuario. No aprueba
mapping, universo, corte, regularización ni apertura; no cierra DT7; no autoriza DEV,
datos reales, Excel, importación, P6/P7, SQL, migración, despliegue, push, PR ni merge.
Los 59 AC de SPEC20 siguen `UNRUN`.

- **Base:** `test` **`d25cbc6`** (2026-11-10), rama `docs/dt7-inventory`. Solo
  documentación.
- **Objetivo:** ampliar el [expediente de readiness](dt7-readiness-2026-11-09.md) con el
  inventario de evidencias de **M1, M2, M5 y M8**: documento, campo, fuente, formato y
  responsable; criterio verificable; decisión humana; dependencia con E4.5/`F-DT7`; y
  efecto de la ausencia.
- **Relación con el expediente:** no lo sustituye ni lo reinterpreta. Los checklists
  M-1…M-6 y C-1…C-3 siguen en el
  [expediente §3 y §4](dt7-readiness-2026-11-09.md); este documento añade la capa de
  **evidencia y decisión**, no una segunda lista de reglas.
- **Regla de contenido:** no se inventan años, Partidas, fuentes, IDs, campos, intervalos,
  cortes, importes, hashes ni aprobadores. Todo hueco queda `[PENDIENTE]`, `[RELLENAR]` o
  `NoAplica` con evidencia negativa. No se designa canal privado ni revisor.
- **No altera:** M1–M16, [tablero](../epic-board.md), gates, SPEC20, testplan, estados de
  E4.5 ni los 59 AC. Los criterios `DT7-EV-*` son de este expediente: **no son AC, ni
  gates, ni PASS**.
- **Etiquetas:** `[CONFIRMADO]` = verificable en spec, Git, código o tablero en la base
  indicada; `[PROPUESTA]` = recomendación de este expediente; `[PENDIENTE]` = evidencia o
  decisión que todavía no existe.

**Fuentes:** [readiness DT7](dt7-readiness-2026-11-09.md),
[cierre de decisiones](dt7-decision-closure-2026-11-05.md),
[preparación con ficción](dt7-preparation-2026-11-05.md),
[SPEC20](../20-historico-precontrol-specification.md),
[testplan 20](../20-historico-precontrol-testplan.md),
[tablero](../epic-board.md), [roadmap](../roadmap.md),
[readiness E4.5](e45-readiness-2026-11-04.md) y
[referencia funcional](../functional-reference-v5.11.md).

---

## 1. Resumen M1 / M2 / M5 / M8

`[CONFIRMADO]` Las cuatro siguen `PENDIENTE DE EVIDENCIA` y solo el usuario las decide
([cierre §5](dt7-decision-closure-2026-11-05.md)). Este documento no cambia ese estado.

| M | Qué debe acreditar | Evidencia nuclear | Decisión humana | Dependencia E4.5 / `F-DT7` | Si falta |
| --- | --- | --- | --- | --- | --- |
| **M1** | Lista cerrada de ejercicios y primero incluido, con cobertura por año | Declaración privada por año + referencia de evidencia; no se deduce de E2.4, archivo ni Movimientos | Lista, primer año y exclusiones; firma del usuario | `estadoUniverso`/`universo`; `F-DT7-11/16/23`; AC-18/24/46/55 | `NoAcreditada`; sin total ni subtotal certificado; G-DT7 no cierra |
| **M2** | Universo cerrado de `PARxxx` y `fuentesEsperadas[]` por ejercicio, con mapping por campo/ID/archivo/apertura/Referencia | Inventario por ejercicio + mapping versionado + conciliación de filas e importes | Aprobar el inventario cerrado y sus faltantes explícitos; no aprueba DEV | `universoPartidas`, `fuentesEsperadas[]`, cobertura; `F-DT7-05/10/13/23`; AC-04/10/46/53/55/58 | `NoAcreditada` o `FuenteAusente`; total `NoVerificable`; mapping no exhaustivo |
| **M5** | Expediente del registro concreto `Regularizacion2026` de 2026 (checklist M6) | Dossier del registro + evidencia de inclusión/no duplicidad + mapping aprobado | Aprobar con evidencia, mantener pendiente, rechazar o dividir si es separable | `clase=Regularizacion2026`, Q5=A; `F-DT7-08`; AC-20/21/22/52 | `RegularizacionPendiente`; total 2026 `NoVerificable`; no suma |
| **M8** | Lista cerrada de `Sxxx` con apertura histórica, o «ninguno» explícito | Lista + importe/fecha/procedencia por `Sxxx`; sin `Dxxx` | Aprobar la lista o el «ninguno»; firma del usuario | `AperturaHistorica`/`saldoId`; `F-DT7-07/17`; AC-16/17/37/43 | `aperturas=null`; no bloquea el total de Gastos, pero deja aperturas sin verificar |

`[CONFIRMADO]` Ninguna de estas evidencias se puede sustituir por los fixtures `F-DT7`:
prueban reglas del contrato, no la verdad del universo, del mapping, del registro ni de la
apertura. El motor puro E4.5 está integrado, pero API/SQL/importador/UI no están
autorizados y sus 59 AC siguen `UNRUN`.

---

## 2. Inventario por decisión

### 2.1 M1 — Ejercicios del histórico y primero incluido

**Evidencia exigida**

| Documento | Campos obligatorios | Fuente | Formato | Responsable |
| --- | --- | --- | --- | --- |
| Declaración de ejercicios del histórico | `ejerciciosIncluidos[]` (`YYYY`), `primerEjercicioIncluido`, `ejerciciosExcluidos[]` con motivo, `evidenciaPorAnio[]` | Declaración privada del usuario + evidencia de cobertura por año | Tabla año → estado → referencia privada; en Git solo recuento y años sanitizados | Usuario decide y aporta; asesor/coordinador prepara sin aprobar |
| Evidencia de cobertura anual | Por año: fuente/versión/hash, intervalo declarado y qué acredita la cobertura de ese año | La fuente privada o el inventario M2 del año | Referencia privada, no el documento | Usuario/asesor |
| Registro de decisión M1 | ID, opción, evidencia, alcance, fecha/responsable, efecto | Plantilla del [cierre §7](dt7-decision-closure-2026-11-05.md) | Texto firmado por el usuario | Usuario |

**Criterios verificables** — `DT7-EV-M1-01…03`, **no AC**

| ID | Criterio |
| --- | --- |
| `DT7-EV-M1-01` | Cada año de `ejerciciosIncluidos` tiene una referencia de evidencia privada que identifica fuente/versión/hash y qué cubre; ningún año se incluye solo porque aparece en E2.4, en un archivo o en Movimientos. |
| `DT7-EV-M1-02` | `primerEjercicioIncluido` pertenece a la lista; todo año excluido tiene motivo explícito; la transición entre dos años contiguos se declara separada, sin arrastre de archivo, plan, apertura, hecho ni foto. |
| `DT7-EV-M1-03` | Un año sin cobertura (por ejemplo, futuro) no se declara `"0.00"` ni `Completa`; `estadoUniverso=Acreditado` solo puede aplicarse a los años con declaración completa. |

**Decisión humana:** lista cerrada, primer año incluido y exclusiones. La firma es la
respuesta explícita e identificable del usuario en el registro de decisión; el coordinador
no firma ni infiere la respuesta del silencio. La autorización P6/P7 y la designación de
canal son gates separados que este documento **no** concede ni designa.

**Dependencia E4.5 / `F-DT7`:** E4.5 proyecta M1 en `universo` y `estadoUniverso`;
`NoAcreditado` es la primera regla de D14 y no se presenta como `Parcial`. `F-DT7-11`,
`F-DT7-16` y `F-DT7-23` protegen la regla; no acreditan años reales. AC-18/24/46/55
siguen `UNRUN`.

**Si falta:** el ejercicio queda `NoAcreditada`; no hay total ni subtotal certificado, no
se usa `"0.00"` por omisión y G-DT7 no puede cerrarse. No se bloquea el trabajo documental
de los demás M, pero sí cualquier afirmación de cobertura real.

### 2.2 M2 — Partidas y fuentes por ejercicio

**Evidencia exigida**

| Documento | Campos obligatorios | Fuente | Formato | Responsable |
| --- | --- | --- | --- | --- |
| Inventario cerrado por ejercicio | `universoPartidas[]` (`^PAR\d+$` existentes); por Partida/fuente: `fuenteId`, `alcance`, `clase`, `intervaloEsperado`, `estado` (`Presente`/`Ausente`/`NoAplica`), `versionFuente`, `documentoHash`, `hojaTabla`, coordenada, `idOrigen` si existe, evidencia | Revisión privada de fuentes y catálogo; no se descubre desde E4.5 ni Movimientos | Tabla por ejercicio → Partida → fuente; en Git IDs, recuentos y hashes sanitizados | Usuario cierra el universo; asesor aporta la fuente; coordinador consolida |
| Mapping por campo | Los 20 campos del [expediente §3.3](dt7-readiness-2026-11-09.md): campo de origen, tipo, presencia, campo de contrato, normalización, ignorado, evidencia, estado | Esquema/muestra de la fuente | Tabla campo → contrato; `NoAplica` solo con evidencia negativa | Asesor/usuario; coordinador prepara |
| Mapping por ID y archivo | `fuenteId`, `idArchivo`, `idOrigen`, `PARxxx`, `REFxxx`, `Sxxx`; hash, versión, hoja/tabla, fila/columna, `reemplazaA` | Fuente + catálogo existente | Tabla versionada por identidad de origen | Usuario/asesor |
| Mapping de Referencia y `NoAplica` | `referenciaOrigen`, `destinoId` (`REFxxx`) o `null`, `estadoMapeoReferencia`, evidencia positiva/negativa | Fuente; política M4 aceptada como propuesta | Tabla por identidad de origen | Usuario/asesor |
| Conciliación del inventario | Filas leídas = mapeadas + excluidas + pendientes + `NoAplica`; 0 filas sin explicación; 0 céntimos de diferencia en recálculo privado | Recálculo independiente | Acta privada con recuentos y diferencia | Revisor independiente + usuario (M10/M12) |
| Registro de decisión M2 | ID, opción, evidencia, alcance, fecha/responsable, efecto | Plantilla del cierre §7 | Texto firmado por el usuario | Usuario |

**Criterios verificables** — `DT7-EV-M2-01…04`, **no AC**

| ID | Criterio |
| --- | --- |
| `DT7-EV-M2-01` | Para cada año de M1, cada Partida esperada (`^PAR\d+$`) tiene al menos una fuente esperada, o un `NoAplica` con evidencia negativa; cada fuente esperada tiene `intervaloEsperado`; `Presente` cubre la Partida recortada al corte; `Ausente` es explícita; no hay `Dxxx`; no se crean destinos. |
| `DT7-EV-M2-02` | El 100 % de los campos elegibles está mapeado o marcado como ignorado con motivo; ninguna asignación se justifica por nombre, importe, orden, posición o parecido; cada mapping tiene `idMapeo`, `version`, `estado`, `evidencia` y vigencia. |
| `DT7-EV-M2-03` | La conciliación de filas da 0 filas sin explicación y la de importes da 0 céntimos de diferencia en el recálculo privado; el repositorio no contiene importes reales ni el documento. |
| `DT7-EV-M2-04` | Una fuente `Presente` sin intervalo es inválida; una fuente `Ausente` no se interpreta como cobertura ni como `"0.00"`; un cambio de fila/columna se registra como versión con coordenada anterior y nueva, no como reasignación. |

**Decisión humana:** aprobar el inventario cerrado por ejercicio y sus faltantes explícitos
(inventario cerrado, híbrido con faltantes o rechazo). La firma es la del usuario en el
registro de decisión; el asesor aporta evidencia y el coordinador prepara, sin aprobar.
**No** se aprueba aquí el mapping como `Aprobado`: eso exige evidencia y decisión dentro de
G-DT7.

**Dependencia E4.5 / `F-DT7`:** M2 alimenta `universoPartidas`, `fuentesEsperadas[]` y la
cobertura; `coberturaGlobal=Completa` exige todas las fuentes presentes y sin huecos.
`F-DT7-05/10/13/23` cubren mapping ambiguo, fuente ausente, solape y D14; AC-04/10/46/53/55
siguen `UNRUN`. La proyección `AnnualSources`/`AnnualHistory` (M14, AC-58) depende de este
inventario, pero su implementación sigue sin autorización.

**Si falta:** el ejercicio queda `NoAcreditada` o con `FuenteAusente`; `coberturaGlobal`
no puede ser `Completa`; los registros sin mapping van a `sinClasificar` y el total global
queda `NoVerificable`; el mapping no puede declararse exhaustivo ni la conciliación
cerrarse. AC-10/46/53/55/58 siguen `UNRUN`.

### 2.3 M5 — Regularización 2026 concreta

**Evidencia exigida**

| Documento | Campos obligatorios | Fuente | Formato | Responsable |
| --- | --- | --- | --- | --- |
| Dossier del registro | `idArchivo` candidato, `clase=Regularizacion2026`, `ejercicio=2026`, intervalo dentro de 2026, importe y signo, `partidaId`/`referenciaId`, `versionMapping`/`estadoMapeo=Mapeado`, `estadoMapeoReferencia` según D4, `procedencia` completa, `estadoVerificacion`, `representadoEnMovimientos` | Fuente privada y checklist M6 | Ficha única del registro; sin importes reales en Git | Usuario aprueba; asesor aporta evidencia; coordinador prepara el dossier |
| Evidencia de inclusión y no duplicidad | Prueba de inclusión previa en archivo/Movimiento o de ausencia; vínculo de origen o tupla+huella si está representado | Fuente + Movimientos/archivo privados | Referencia privada; recuento sanitizado | Usuario/asesor |
| Evidencia de separabilidad | Si el registro está embebido: prueba de que es separable; si no, no se resta | Fuente | Texto acotado con referencia | Usuario/asesor |
| Registro de decisión M5 | ID, opción, evidencia, alcance, fecha/responsable, efecto | Plantilla del cierre §7 | Texto firmado por el usuario | Usuario |

**Criterios verificables** — `DT7-EV-M5-01…03`, **no AC**

| ID | Criterio |
| --- | --- |
| `DT7-EV-M5-01` | Se cumplen **todos** los puntos del checklist M6 ([cierre §2](dt7-decision-closure-2026-11-05.md)); si falta cualquiera, el registro queda `Pendiente`/`NoVerificado` y no suma. |
| `DT7-EV-M5-02` | Ejercicio 2026 e intervalo dentro de 2026; importe y signo exactos y acreditados; mapping aprobado con versión y vigencia; si está representado se excluye una vez; una parte embebida inseparable no se resta sin evidencia. |
| `DT7-EV-M5-03` | Q5=A no se reabre ni se generaliza a otro ejercicio; no se infiere por nombre «regularización»; el aprobador, la fecha, el alcance y el motivo constan. |

**Decisión humana:** aprobar con evidencia, mantener pendiente, rechazar o dividir si es
separable. Decide el usuario; el coordinador prepara y no aprueba. Una excepción con
efecto financiero exige la aprobación del usuario (M9, ratificada).

**Dependencia E4.5 / `F-DT7`:** E4.5 admite `clase=Regularizacion2026` y Q5=A ya está
aprobada; `F-DT7-08` protege el caso. AC-20/21/22/52 siguen `UNRUN`. M5 depende de M2 para
el mapping de Partida/Referencia y de M6 para el checklist, ya aceptado.

**Si falta:** el registro queda `RegularizacionPendiente`; el total de 2026 queda
`NoVerificable` y el registro no suma ni se resta del agregado. No se aplica a 2025/2027 ni
se convierte en regla general. AC-20/21/22/52 siguen `UNRUN`.

### 2.4 M8 — Saldos con apertura histórica

**Evidencia exigida**

| Documento | Campos obligatorios | Fuente | Formato | Responsable |
| --- | --- | --- | --- | --- |
| Lista cerrada de aperturas | `saldoId` (`Sxxx`), `idArchivo` candidato, importe con signo, `fecha` y `evidenciaFecha`, `procedencia`, `estadoVerificacion`, versión | Inventario privado de Saldos y aperturas | Tabla por `Sxxx`; o «ninguno» explícito | Usuario |
| Evidencia de naturaleza | Prueba de que es apertura histórica y no Movimiento; prueba de que no escribe Saldos/Deudas; prueba de que no suma a Gastos | Fuente + E1.1/E1.6 | Referencia privada | Usuario/asesor |
| Registro de decisión M8 | ID, opción, evidencia, alcance, fecha/responsable, efecto | Plantilla del cierre §7 | Texto firmado por el usuario | Usuario |

**Criterios verificables** — `DT7-EV-M8-01…03`, **no AC**

| ID | Criterio |
| --- | --- |
| `DT7-EV-M8-01` | Cada `Sxxx` de la lista existe como destino; `Dxxx` queda fuera y se muestra «No soportado por E4.5; ver E4.4»; no se crean Saldos ni Deudas. |
| `DT7-EV-M8-02` | La ausencia de aperturas se registra como «ninguno» explícito, no se deduce de la falta de datos; `aperturas=null` solo sin evidencia; un cero solo con apertura cero verificada. |
| `DT7-EV-M8-03` | La apertura no suma a Gastos, no acredita cobertura de Gastos y no escribe en Saldos/Deudas; su intervalo queda fuera de la cobertura de Gastos. |

**Decisión humana:** lista cerrada de `Sxxx` o «ninguno» explícito. Decide el usuario; la
firma es su respuesta identificable en el registro de decisión. No se designa revisor ni
canal.

**Dependencia E4.5 / `F-DT7`:** E4.5 expone `aperturas`/`aperturasNoVerificadas` y no
escribe Saldos. `F-DT7-07/17` cubren apertura de Saldo y Deuda fuera; AC-16/17/37/43 siguen
`UNRUN`. M8 depende de E1.1 para que `Sxxx` exista y de la evidencia de que no es un
Movimiento.

**Si falta:** `aperturas=null`; no se asume `"0.00"`; el total de Gastos no se bloquea por
esta ausencia, pero la posición inicial queda sin verificar y no se puede afirmar la
relación con Saldos. AC-16/17/37/43 siguen `UNRUN`.

---

## 3. Separación de la evidencia

### 3.1 (a) Preparar documentalmente sin datos reales

`[CONFIRMADO]` Todo esto puede completarse y revisarse sin abrir Excel, base real, extracto
ni fuente privada:

| Artefacto | Para qué M | Quién lo prepara | Criterio de cierre documental |
| --- | --- | --- | --- |
| Plantilla de declaración de ejercicios y transición | M1 | Coordinador | Campos y criterios `DT7-EV-M1-*` completos, sin valores reales |
| Plantilla de inventario por ejercicio/Partida/fuente | M2 | Coordinador | Columnas, estados y evidencia exigida; sin IDs ni importes reales |
| Plantilla de mapping por campo/ID/archivo/Referencia | M2 | Coordinador | 20 campos de contrato y reglas de `NoAplica`; sin valores |
| Checklist M6 y ficha de regularización | M5 | Coordinador | Campos y criterios; sin el registro concreto |
| Plantilla de lista de aperturas y «ninguno» | M8 | Coordinador | Campos y límites; sin `Sxxx` reales |
| Índice de evidencias y manifiesto de hashes | M1/M2/M5/M8 | Coordinador | Formato de referencia privada, sin documento |
| Plantilla de decisión y registro de firma | M1/M2/M5/M8 | Coordinador | ID, opción, evidencia, alcance, fecha/responsable, efecto |
| Criterios `DT7-EV-*` y trazabilidad a AC/`F-DT7` | Todos | Coordinador | Sin PASS; estados `UNRUN` |

`[PROPUESTA]` El resultado documental de (a) es un **paquete de estructura**, no una
revisión: no acredita ningún año, fuente, mapping, registro ni apertura.

### 3.2 (b) Evidencia que exige revisión privada

`[CONFIRMADO]` Requiere autorización P6/P7 y un canal privado designado por el usuario
(M11/M13). Este documento no designa ni el canal ni el acceso.

| Evidencia | M | Por qué no puede prepararse en el repositorio |
| --- | --- | --- |
| Años reales, primero incluido y exclusiones | M1 | Identifica el alcance histórico privado |
| Lista real de `PARxxx`, `fuenteId`, `Sxxx`, `REFxxx` | M2/M8 | Identificadores y catálogo privados |
| Documento/fuente, hoja/tabla, fila/columna, hash y versión | M1/M2/M5/M8 | El documento y su contenido son privados |
| Mapping campo → contrato con valores y coordenadas | M2 | Puede contener datos personales y estructura privada |
| Intervalos, cortes, `controlDetalle` y cobertura real | M2 | Valores económicos y temporales privados |
| Registro concreto de regularización, importe, signo y vínculo | M5 | Importe y hecho económico reales |
| Importe, fecha y procedencia de cada apertura | M8 | Posición financiera privada |
| Conciliación 100 % / 0 céntimos y firmas | M2/M5/M8 | Resultado y firmas privadas; M10/M12 |

**Frontera:** en el repositorio solo se registran IDs, hashes, recuentos y agregados
sanitizados; nunca el documento, importes reales, datos personales ni firmas.

### 3.3 (c) Decisiones humanas

`[CONFIRMADO]` Ninguna de estas decisiones se delega al coordinador ni a un agente. El
silencio no aprueba.

| ID | Qué decide | Quién decide | Qué firma | Alcance de la firma | No delegable |
| --- | --- | --- | --- | --- | --- |
| **M1** | Años incluidos, primero incluido y exclusiones | Usuario | Respuesta identificable en el registro de decisión | Lista y transición | Sí |
| **M2** | Inventario cerrado por ejercicio y faltantes explícitos | Usuario | Respuesta identificable en el registro de decisión | Universo, fuentes y mapping candidato | Sí |
| **M5** | Aprobar / pendiente / rechazar / dividir la regularización | Usuario | Respuesta identificable + aprobador/fecha | Registro concreto y efecto en 2026 | Sí |
| **M8** | Lista de `Sxxx` o «ninguno» | Usuario | Respuesta identificable en el registro de decisión | Aperturas y relación con Saldos | Sí |
| **M9** | Excepción con efecto financiero | Usuario | Aprobación explícita | Excepción acotada | Sí (ratificada) |
| **M11** | Custodia y acceso a evidencia | Usuario | Procedimiento aprobado | Acceso, cifrado y auditoría | Sí; procedimiento pendiente |
| **M12** | Revisor independiente y firma de conciliación | Usuario | Firma del revisor + usuario | Candidato/SHA, inventario, mapping y resultado | Sí; **no se designa aquí** |
| **M13** | Autorización P6/P7 | Usuario | Autorización explícita con alcance y fecha | Datos reales e importación | Sí; hoy **no autorizada** |

`[PROPUESTA]` El coordinador prepara el paquete, señala huecos y propone opciones; no
firma, no aprueba, no designa revisor ni canal y no convierte una opción recomendada en
`Aprobado`.

---

## 4. Paquete mínimo para una primera revisión privada

`[PROPUESTA]` El paquete mínimo es el conjunto que permite revisar **estructura y
evidencia exigida** sin exponer datos y sin prejuzgar la decisión.

### 4.1 Qué se llevaría

1. Este inventario y el [expediente de readiness](dt7-readiness-2026-11-09.md), sin
   importes ni documento real.
2. Plantillas vacías de M1, M2, M5 y M8, con campos, estados y criterios `DT7-EV-*`.
3. Los checklists M-1…M-6 y C-1…C-3 del expediente, como formularios a rellenar.
4. El índice de evidencias y el formato de referencia privada (fuente/versión/hash,
   hoja/tabla, fila/columna, fecha y actor), sin contenido.
5. La plantilla de decisión del cierre §7 y la lista de decisiones M1/M2/M5/M8.
6. La trazabilidad a `F-DT7`, AC y gates, marcada `UNRUN`/`PENDIENTE`.
7. El alcance escrito de la revisión: qué se revisa, qué no y qué sigue bloqueado.

### 4.2 Qué no se llevaría

- El Excel, extractos, bases reales, documentos fuente, importes, datos personales,
  credenciales ni secretos.
- Valores reales de `PARxxx`, `fuenteId`, `idArchivo`, `Sxxx`, `REFxxx`, hashes o
  coordenadas.
- Mapping, intervalos, cortes o aperturas ya «rellenados» por inferencia.
- Designación de canal, revisor, fecha de revisión o firma.
- Autorización P6/P7, DEV, importación, push, PR o merge.
- Fixtures `F-DT7` presentados como evidencia real o como PASS.

### 4.3 Condiciones de la primera revisión

- Autorización expresa del usuario para revisar con evidencia privada y para el canal; sin
  ella, solo se revisa estructura.
- P6/P7 sigue siendo un gate separado: este documento **no** lo solicita ni lo concede.
- La revisión no cierra DT7, no aprueba M1/M2/M5/M8 y no cambia el tablero.
- Cualquier diferencia, hueco o `NoAplica` se registra como `[PENDIENTE]`, no se rellena
  por defecto.

---

## 5. Criterio «listo para decisión», no aprobado

`[PROPUESTA]` Se propone un estado intermedio **`LISTO PARA DECISIÓN` (LPD)**, distinto de
`PENDIENTE DE EVIDENCIA` y de `APROBADO`. LPD significa que el usuario ya puede decidir con
evidencia; **no** significa que haya decidido ni que el mapping, el universo o el registro
estén aprobados.

**Condiciones LPD (las cuatro M):**

| ID | Condición |
| --- | --- |
| `DT7-EV-LPD-01` | Todos los criterios `DT7-EV-Mx-*` de esa M están satisfechos y referenciados en privado. |
| `DT7-EV-LPD-02` | No queda ningún `[PENDIENTE]` en un campo obligatorio; todo hueco está clasificado (`NoAplica` con evidencia negativa o `Pendiente` con responsable y efecto). |
| `DT7-EV-LPD-03` | El registro de decisión está redactado con ID, opción, evidencia, alcance, fecha/responsable y efecto; **sin firmar**. |
| `DT7-EV-LPD-04` | Está escrito el efecto de aprobar y de rechazar, incluido el peor caso de cobertura/total/mapping. |
| `DT7-EV-LPD-05` | La conciliación aplicable (filas/importes o inclusión/no duplicidad) está hecha y referenciada; el importador no se usa como oráculo. |
| `DT7-EV-LPD-06` | El estado sigue siendo `PENDIENTE DE EVIDENCIA` en el tablero; LPD no es `Aprobado`, no es PASS y no cierra DT7. |

**Preparación por decisión**

| M | Estará listo para decisión cuando… | Hoy |
| --- | --- | --- |
| M1 | La lista de años, el primero incluido y las exclusiones tengan evidencia por año; la transición esté declarada; el registro de decisión esté redactado. | No: faltan años y evidencia privada |
| M2 | El inventario por ejercicio esté cerrado; el mapping por campo/ID/archivo/apertura/Referencia esté completo; la conciliación de filas e importes dé 0 sin explicación y 0 céntimos; el registro de decisión esté redactado. | No: faltan fuentes, mapping y conciliación |
| M5 | El checklist M6 esté completo; el dossier del registro y la separabilidad estén acreditados; las opciones estén redactadas. | No: falta el registro concreto |
| M8 | La lista de `Sxxx` o el «ninguno» esté cerrada; cada apertura tenga importe/fecha/procedencia; no haya `Dxxx`; el registro esté redactado. | No: falta la lista y su evidencia |

`[CONFIRMADO]` LPD **no** se declara en este documento. Ninguna M lo alcanza hoy.

---

## 6. Tabla de «no hacer»

| No hacer | Por qué | Alternativa correcta |
| --- | --- | --- |
| Inferir mappings por nombre, importe, orden, posición o parecido | Convierte una coincidencia en identidad y puede atribuir un gasto a la Partida equivocada | Dejar `Pendiente`/`Ambigua`, visible en `sinClasificar`; no sumar |
| Completar intervalos, cortes o `controlDetalle` por defecto | Un hueco o solape oculto certifica un total falso | Declarar `[PENDIENTE]`; unión de días inclusivos con huecos y solapes explícitos |
| Designar canal privado o revisor independiente | Es una decisión del usuario (M11/M12) y un gate de seguridad | Mantenerlo `[PENDIENTE]`; el coordinador solo prepara |
| Deducir los años del histórico desde E2.4, archivo o Movimientos | Son fuentes de descubrimiento, no prueba de universo | Declaración cerrada del usuario (M1) |
| Tratar «todo el catálogo» o una fuente presente como universo completo | `NoAcreditada` no es `Parcial` ni `Completa` | `estadoUniverso=NoAcreditado` si falta la declaración |
| Convertir una fuente ausente o un año futuro en `"0.00"` | `null` no es `0`; ausencia no es cobertura | `NoDisponible`/`FuenteAusente`; total `null` |
| Aprobar la regularización por su nombre o generalizarla a otro año | Q5=A solo admite 2026 con evidencia y sin regla general | `RegularizacionPendiente`; M5 decide el registro concreto |
| Sumar una apertura a Gastos, mapear `Dxxx` o escribir en Saldos/Deudas | Rompe la separación Q7=A y la autoridad de E1.1/E1.6/E4.4 | Apertura aparte; Deuda «No soportado por E4.5»; sin escritura |
| Presentar `F-DT7` o el motor puro como PASS o evidencia real | Prueban reglas sintéticas, no la verdad del universo ni del mapping | Mantener `UNRUN`; la evidencia real es privada y la decide el usuario |
| Declarar LPD, aprobado o cerrado DT7 por silencio o por este documento | El silencio no aprueba; el coordinador no firma | Esperar la respuesta explícita e identificable del usuario |
| Publicar el documento, importes, datos personales o firmas en Git | Incidente de privacidad y seguridad (M11) | Solo IDs, hashes, recuentos y agregados sanitizados |

---

## 7. Dependencias y trazabilidad

| M | Consumidor | Artefacto | Prueba sintética | AC afectados (todos `UNRUN`) | Gate |
| --- | --- | --- | --- | --- | --- |
| M1 | E4.5 → E2.4/E4.7 | `universo`, `estadoUniverso`, transición | `F-DT7-11/16/23` | AC-18/24/46/55 | G-DT7 |
| M2 | E4.5 → E2.4/E4.7/E4.12 | `universoPartidas`, `fuentesEsperadas[]`, mapping, cobertura | `F-DT7-05/10/13/23` | AC-04/10/46/53/55/58; AC-30 | G-DT7 + G-E2.4 |
| M5 | E4.5 → E2.4/E4.7 | registro `Regularizacion2026`, Q5=A | `F-DT7-08` | AC-20/21/22/52 | G-DT7 |
| M8 | E4.5 (aperturas) y E1.1 | `AperturaHistorica`, `saldoId`, `aperturas` | `F-DT7-07/17` | AC-16/17/37/43 | G-DT7 |

`[CONFIRMADO]` E4.5 integrado es motor puro: no hay API, SQL, persistencia, importador, UI
ni lectura de ficheros; el tablero registra 81 pruebas y APTO CON RESERVAS por incremento,
sin informe QA versionado. `F-DT7-01…25` no se ha ejecutado como catálogo. Por tanto, M1/M2/
M5/M8 pueden prepararse documentalmente, pero su verificación real exige P6/P7, canal
privado, conciliación independiente y firma; DEV E4.5 sigue sin autorización.

---

## 8. Límites y verificación

- **No cierra DT7:** M1/M2/M5/M8 siguen `PENDIENTE DE EVIDENCIA`; M4/M7/M15/M16 siguen
  `ACEPTADA COMO PROPUESTA`; M11 mantiene su procedimiento pendiente; M14 sigue sin
  implementación. Los 59 AC siguen `UNRUN`.
- **No aprueba:** ni universo, ni mapping, ni corte, ni regularización, ni apertura, ni
  excepción. No declara LPD.
- **No designa:** canal privado ni revisor independiente. No solicita P6/P7.
- **No usa datos reales:** no se abrió Excel, base real, extracto ni fuente privada; no se
  ejecutaron suites funcionales.
- **No modifica** decisiones, tablero, SPEC20, testplan ni estados de E4.5.
- **Verificación de esta rama:** `python3.12 scripts/validate-template .` PASS y
  `python3.12 scripts/verify baseline` PASS (fase de aplicación no incluida).
