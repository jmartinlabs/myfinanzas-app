# 29 — E4.11 Fotografías de ciclo/trimestre/año consultables: Test plan

Specification: [29-e411-fotografias-specification.md](29-e411-fotografias-specification.md)

Status: **APROBADO — 2026-11-06.** Aprobación formal del usuario; merge documental #242 `6fe91d7`.
Ejecución funcional con fixtures registrada el 2026-11-07 y revisada el 2026-11-09: **14
`PASS (fixtures)`, 1 `PARCIAL` y 15 dimensiones de datos reales `BLOCKED real`**; no declara
aceptación global ni PASS de aceptación. Las definiciones siguen congeladas. DEV autorizado
por separado el 2026-11-06. Los datos de ejecución son fixtures sintéticos; no se usan datos
reales. Las decisiones M1–M6
están aprobadas: P1-C/P4-A/P5-B, P2-A, P3-B, P6-A, P7-D y P8a-A/P8b-A (2026-11-06). Base:
`main` `eca4e23` (2026-11-06); E4.9 `0176ffc`; E4.10 I1–I6 integrados; candidato de
aceptación `c7a480f` (2026-11-07). Enmienda de alcance aprobada por el usuario el
**2026-11-08** (transmitida por el coordinador): AC08 se alinea con P3-B sin
`FueraDePeriodo` y AC15 se acota a E4.3/E4.4 con E4.2 como cobertura pendiente. En esa
enmienda los estados por AC y las definiciones congeladas no cambian y no se declara
aceptación.

**Revisión de estados 2026-11-09 — `[PROPUESTA]`, pendiente de aprobación.** Con la
evidencia ya integrada en `test` `b14902d` — #295 (T2 real de clasificación/referencias),
#300 (motivo por bloque con `null`/ausente), #301 (enmienda AC08/AC15) y #310 (test AC15
E4.3/E4.4, aserción P3-B de AC08 y refuerzo `motor` en AC01/AC02) —, la ejecución con fixtures
pasa a **14 `PASS (fixtures)` y 1 `PARCIAL`** (AC09, por clave ausente), la suite e411 a **43
pass / 0 fail** y las **15 dimensiones de datos reales siguen `BLOCKED real`**. Las
definiciones congeladas y M1–M6 no cambian. Esta revisión no declara aceptación global ni PASS
de aceptación; el veredicto corresponde al usuario y a QA.

Este testplan distingue `PASS (fixtures)` de aceptación: no declara aceptación global ni
cierre financiero real. La política de composición queda fijada por las decisiones aprobadas;
no se reinterpreta en la ejecución.

## Matriz de aceptación

Estados asignados según la matriz AC → evidencia → límite del informe
[`e411-acceptance-2026-11-07.md`](investigations/e411-acceptance-2026-11-07.md) (2026-11-07)
y revisados el 2026-11-09 con la evidencia de #295/#300/#310 (nota de estado en ese mismo
informe).
Cada AC conserva además la dimensión de datos reales `BLOCKED real`; `PASS (fixtures)` no es
aceptación global.

| Acceptance ID | Precondiciones y acción | Resultado esperado | Método/comando propuesto | Plataforma/owner | Evidencia esperada | Estado actual | Candidato/fecha |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E4.11-AC01 | Fixture con ciclo cerrado y foto v1; aplicar T2 (clasificación/referencias/plan vivo) y T3 (renombrar) después del cierre; consultar foto y cálculo vivo del mismo ciclo. | Foto devuelve los valores persistidos al cierre; vista viva devuelve otros valores, rotulada `CalculoVivo` con motor y `revision`; ninguna cifra de la foto cambia. | Bun Test de contrato + snapshot SQLite antes/después de T2/T3 | Documental; API/UI futura (E4.11 · DEV) | Foto v1, DTO vivo, snapshot y diff | PASS (fixtures) · BLOCKED real | b14902d · 2026-11-09 |
| E4.11-AC02 | Consultar metadatos de la foto antes y después de T2/T3. | Ciclo, versión, UTC, actor, motivo, fingerprint, versión de app/esquema y ventana `[inicio, fin]` visibles e idénticos; sin recálculo. | Bun Test de contrato de metadatos | Documental; API futura | DTO de identidad y comparación byte a byte | PASS (fixtures) · BLOCKED real | b14902d · 2026-11-09 |
| E4.11-AC03 | Fixture con v1 y v2 (con E4.10 I1–I5 integrados); seleccionar v1 explícitamente y luego v2. | Cada consulta devuelve exactamente la versión solicitada con `seleccionAplicada`; la otra sigue consultable e intacta.  | Bun Test de selección de versión + Playwright del selector | Documental; API/UI futura | Dos DTO y captura 390/1440 del selector | PASS (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC04 | Consultar un trimestre y un año con varios ciclos cerrados. | Cada cifra agregada referencia las fotos de ciclo que la componen (ciclo, versión, fingerprint) y la regla de composición; ninguna cifra proviene de motores vivos. | Bun Test de composición + snapshot | Documental; API futura | DTO de composición y traza a fotos | PASS (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC05 | Periodo con ciclos en versiones distintas y/o un ciclo reabierto. (P1-C/P4-A/P5-B) | La respuesta declara por ciclo versión usada, inclusión/exclusión y motivo; la mezcla se permite con composición exacta; el reabierto se excluye/marca; no hay composición silenciosa. | Bun Test de composición P1-C/P4-A/P5-B | Documental; API futura | DTO con `composicion[]` completa y motivo | PASS (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC06 | Ciclo reabierto sin v2 (E4.10 I2 integrado). (P1-C/P4-A) | Excluido y marcado `PendienteReCierre`; v1 consultable pero no vigente sin advertencia; no se crea foto. | Bun Test + Playwright del estado y del badge | Documental; API/UI futura | DTO de estado, badge y ausencia de foto nueva | PASS (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC07 | Generar/consultar un agregado de trimestre/año y después re-cerrar un ciclo creando v2; volver a consultar el agregado anterior y generar uno nuevo. (P2-A/P6-A) | El agregado persistido anterior devuelve los mismos valores y versiones; no se recalcula. El nuevo declara las versiones nuevas. | Bun Test de agregado persistido P2-A + snapshot | Documental; API futura | Dos DTO de agregado y snapshot sin cambios en el primero | PASS (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC08 | Desde una cifra de periodo, navegar a los ciclos componentes (incluidos y excluidos). | Cada incluido devuelve su foto y cobertura; cada excluido figura con motivo (sin cierre, pendiente de re-cierre). Un ciclo fuera del periodo no compone ni se enumera como contexto: P3-B lo atribuye íntegro a su propio periodo por `mes_financiado`. | Bun Test de drill-down + Playwright | Documental; API/UI futura | DTO por ciclo y capturas 390/1440 | PASS (fixtures) · BLOCKED real | b14902d · 2026-11-09 |
| E4.11-AC09 | Periodo con un ciclo sin cierre, un hueco o una fuente `No disponible`. | `Parcial`/`NoDisponible` con motivo por bloque; ningún total parcial se declara completo ni se sustituye por `0`. | Bun Test de estados de cobertura + Playwright | Documental; API/UI futura | DTO de cobertura y captura del total «parcial» | PARCIAL (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC10 | Ejercicio con solo archivo E4.5 y sin fotos. (P8b-A) | El primer desarrollo excluye el archivo E4.5: no hay ruta ni `tipoRegistro=Archivo`; no se crea foto, cierre ni plan. Consulta separada diferida. | Bun Test negativo de ausencia de ruta + snapshot | Documental; API futura | Sin ruta/tipoRegistro; snapshot sin altas | PASS (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC11 | Consultar fotos y periodos de 2026; crear el ejercicio 2027 y volver a consultar 2026. (P3-B) | Valores, versiones y cortes de 2026 se conservan; no se reetiquetan, recalculan ni borran; la transición no mezcla ejercicios sin declararlo. | Bun Test de continuidad + snapshot antes/después | Documental; API/UI futura | DTO 2026 pre/post y snapshot | PASS (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC12 | `POST`/`PATCH`/`DELETE` sobre fotos o periodos. | 405/422; no se crea, rectifica ni borra foto. Excepción única: creación del agregado P2-A, con ruta y clave propias. | Bun Test de rutas y verbos | Documental; API futura | Respuestas y snapshot sin cambios | PASS (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC13 | Intentar rectificar un ciclo antiguo o consultar una «foto corregida» por DT9. (P8a-A) | No existe ruta; rechazo con motivo; E4.11 no habilita DT9. | Bun Test negativo + revisión de rutas | Documental; API futura | 404/405 con motivo y ausencia de endpoint | PASS (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC14 | Consultar un periodo futuro y un ciclo sin cierre. | Periodo futuro: 422 con campo/motivo. Ciclo sin cierre: `SinFoto` con motivo. Ninguno devuelve `0` ni foto vacía. | Bun Test de validación + Playwright de estados | Documental; API/UI futura | DTO de error y captura del estado vacío | PASS (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC15 | Consultar una foto con bloques E4.3/E4.4 `No disponible`, con motores vivos disponibles. | El bloque se muestra `No disponible` con motivo; no se completa desde el motor vivo ni se declara completo el total. | Bun Test de contrato de bloques + snapshot | Documental; API futura | DTO con `noDisponible[]` y total no certificado | PASS (fixtures) · BLOCKED real | b14902d · 2026-11-09 |

`[APROBADO 2026-11-08]` AC15 se limita a los bloques **E4.3/E4.4** existentes en el
contrato de foto E4.9. **E4.2** (Ventas) no tiene bloque en ese contrato: queda como
cobertura **pendiente**, no se prueba como `No disponible`, no cuenta como PASS y no se
presume inexistente.

## Casos obligatorios del roadmap

| Caso del roadmap | Fila(s) | Qué debe demostrar |
| --- | --- | --- |
| Valores actuales ≠ foto | E4.11-AC01, E4.11-AC02 | La foto no se mueve al cambiar T2/T3; lo vivo se etiqueta y se separa. |
| Selección explícita de versión anterior | E4.11-AC03, E4.11-AC08 | v1 y v2 consultables e intactas; el selector no cambia de versión en silencio. |
| Trimestre/año tras re-cierre | E4.11-AC05, E4.11-AC06, E4.11-AC07 | La composición se declara; el agregado persistido anterior no se recalcula. |
| Continuidad entre ejercicios | E4.11-AC11 | 2026 sigue consultable en 2027, sin reetiquetar ni borrar. |

## Decisiones aprobadas aplicables

| Decisión | Filas afectadas | Regla aprobada |
| --- | --- | --- |
| M1 (P1-C/P4-A/P5-B) | AC03, AC04, AC05, AC06, AC07 | Composición declarada, reabierto marcado, mezcla registrada. |
| M2 (P2-A) | AC04, AC07, AC12 | Agregado persistido, versionado e inmutable. |
| M3 (P3-B) | AC04, AC05, AC08, AC11 | Periodos por ciclos financiados, mes financiado, sin prorrateo. |
| M4 (P6-A) | AC07, AC11 | Retención permanente de fotos y agregados. |
| M5 (P7-D) | AC01, AC03, AC08 | Consulta combinada ciclo/trimestre/año con selector explícito. |
| M6 (P8a-A/P8b-A) | AC10, AC13 | DT9 fuera; archivo E4.5 excluido del primer desarrollo. |

## Dependencias que bloquean la ejecución

- **E4.9:** integrado `0176ffc` con QA APTO CON RESERVAS; contrato de foto estable. La
  ejecución E4.11 con fixtures es del 2026-11-07.
- **E4.10:** I1–I5 integrados (v26, reapertura, guardas, re-cierre, cancelación). AC03/AC06/AC07
  se construyeron y ejecutaron con fixtures de v1/v2 (2026-11-07).
- **E4.5 (SPEC20):** excluido del primer desarrollo por P8b-A; AC10 se ejecutó como caso
  negativo y AC15 se ejecutó acotado a E4.3/E4.4. E4.5 sigue fuera de alcance (`UNRUN`).
- **DT6/T-BKP:** abierto; el cierre real sigue `BLOCKED real`. Los AC se ejecutaron con
  fixtures sintéticos: 14 `PASS (fixtures)` y 1 `PARCIAL` (revisión 2026-11-09).
- **DT9:** no habilitado; AC13 se diseña como caso negativo.

## Regression checks

La suite E4.11 existe y se ejecutó: `bun test apps/api/src/e411*.test.ts` **43 pass / 0 fail**
(revisión 2026-11-09; eran 36 en el candidato `c7a480f`). El full Linux `42415751714` (36
tests) **no cubre** los tests/E2E añadidos después (#295/#300/#310); el required de #310
`42534635206` ejecutó API (perfil critical) sin E2E, por lo que el E2E nuevo queda `UNRUN`
hasta un full posterior. No hay una tabla de regresión por fila
ejecutada; esos casos conservan `UNRUN`. No se reutiliza evidencia de E4.9/E4.10 como si fuera
de E4.11.

## Functional verification

Ejecutada con fixtures (revisión 2026-11-09): 14 `PASS (fixtures)` y 1 `PARCIAL` (AC09); 15
dimensiones de datos reales `BLOCKED real`. No hay aceptación global ni validación con datos
reales. Evidencia:
[`e411-acceptance-2026-11-07.md`](investigations/e411-acceptance-2026-11-07.md).

## Browser verification

`PARCIAL (fixtures)`. La E2E I6 y el selector se ejecutaron en full Linux PASS, pero las 66
capturas 390/1440 no están versionadas; la aceptación visual no es verificable desde Git. Los
casos de navegador no ejecutados conservan `UNRUN`.

## Datos y fixtures

`[PROPUESTA]` Solo datos ficticios y deterministas: ciclos cerrados con foto v1, un ciclo
reabierto sin v2, un re-cierre con v2, un periodo mixto y un ciclo sin cierre. El archivo E4.5
queda fuera del primer desarrollo (P8b-A). Prohibido usar datos reales, bases privadas, credenciales o secretos.
Los fixtures no acreditan DT6 ni DT7.

## Limitations and next action

- Ejecución funcional con fixtures registrada (revisión 2026-11-09: 14 `PASS (fixtures)`, 1
  `PARCIAL`); ningún AC validado con datos reales. Las 15 dimensiones reales siguen `BLOCKED real`.
- La política de agregación y la versión canónica están fijadas por M1–M6 aprobadas.
- E4.9/E4.10 I1–I5 están integrados; los fixtures de v1/v2 se ejecutaron.
- Reservas vigentes: AC09 por clave ausente; AC07 por la etiqueta `porDefecto`; E4.2 como
  cobertura pendiente de AC15; capturas 390/1440 no versionadas; y la validación con datos
  reales. AC01/AC02/AC08/AC15 ya no tienen reserva funcional con fixtures. El veredicto de
  aceptación corresponde al usuario/QA.

## Enmienda AC09 — claves obligatorias y ausencias `[PROPUESTA]`

`[PROPUESTA]` Enmienda documental que desarrolla
[SPEC29 §18](29-e411-fotografias-specification.md) y corrige las reservas QA de #315
(F1–F8), con la precisión D1/H de 2026-11-09. Base: `test` `0406e5d`. No está aprobada,
no cambia los estados de la matriz, no declara aceptación y no autoriza DEV. Mantiene AC09
en `PARCIAL (fixtures) · BLOCKED real`; no toca AC07 ni E4.2.

`[PROPUESTA]` **Precisión D1/H.** `no_disponible` es
`TEXT NOT NULL CHECK(json_valid(no_disponible))` en `fotos_cierre` y `fotos_periodo`; SQL
`NULL` no es un escenario válido. El contrato de foto vigente emite `noDisponible` como
objeto, por lo que una clave ausente o `null` solo se representa en un fixture unitario o
en una fila histórica anómala, no creando una foto con el producto. `{}` es un vacío
válido por contrato/fixture, pero no es el caso de la captura actual de `e49.ts` (emite un
objeto con tres claves); `[]` es un array vacío legítimo. Con cobertura `Parcial` ambos
producen `noDisponible:[]` sin entradas ficticias y no sustituyen el motivo de la
cobertura. La lectura de agregados históricos conserva JSON `null` como
`noDisponible:null` y JSON `[]` como `[]`; no normaliza ni reescribe, y la UI debe tener
una guarda explícita para `null` (no recorrerlo como array).

### Casos propuestos (`UNRUN`)

| Caso | Precondición y acción | Resultado esperado | Límite |
| --- | --- | --- | --- |
| AC09-A | Foto con un bloque `null` en `cobertura.totales` y una entrada `null` en `noDisponible`; generar agregado y consultar. | Cobertura: `"<bloque>: Bloque no disponible en la foto"`; `noDisponible[]` con `codigoAusencia:"NULO_EXPLICITO"`; `totalPeriodo:null`; sin `0`. | `UNRUN`; la parte de cobertura ya tiene evidencia con fixtures, pero no es PASS de aceptación. |
| AC09-B | Foto sin una clave canónica de `cobertura.totales`; generar agregado y consultar. | Motivo `"<bloque>: Bloque ausente en la foto"`; sin entrada propia en `noDisponible[]`; `totalPeriodo:null`; sin `0`. | `UNRUN`; requiere cambio de producto. |
| AC09-C | Foto con objeto `No disponible`/`NoDisponible` de `noDisponible` sin `motivo`; generar agregado. | Motivo `"Motivo no informado en la foto"`; `noDisponible[]` con `codigoAusencia:"MOTIVO_AUSENTE"`; `totalPeriodo:null`. | `UNRUN`; requiere cambio de producto. |
| AC09-C2 | Foto con objeto `Parcial` sin `motivo` en `cobertura.totales` o en `noDisponible`; generar agregado. | Se declara en `cobertura.bloques[].motivos`; no se emite en `noDisponible[]` ni se convierte en `No disponible`; `totalPeriodo:null`. | `UNRUN`; requiere cambio de producto. |
| AC09-D1 | Fixture unitario del compositor sin la clave `noDisponible`; **no construible** por `fotos_cierre`/`fotos_periodo` (`TEXT NOT NULL`) ni por el contrato de foto. | Entrada centinela `bloque:"no_disponible"` con `codigoAusencia:"NO_DISPONIBLE_AUSENTE"`; `totalPeriodo:null`; sin `0`. | `UNRUN`; caso defensivo, no estado de producto ni aceptación. |
| AC09-D2 | Foto/fixture con `noDisponible:null` (fila histórica anómala; no contrato vigente) al crear un agregado nuevo. | Entrada centinela `bloque:"no_disponible"` con `codigoAusencia:"NULO_EXPLICITO"`; `totalPeriodo:null`; sin `0`. Distinto de `[]` (no genera centinela) y de la clave ausente. | `UNRUN`; fixture/legacy, no contrato. |
| AC09-D3 | `noDisponible:{}` y, por separado, `noDisponible:[]`, ambos con `cobertura`/`cobertura.totales` en `Parcial`; generar agregado. | `noDisponible:[]` sin entradas ficticias; la parcialidad se declara en `cobertura.motivos`/`cobertura.bloques[].motivos`; `totalPeriodo:null`; sin `0`. `{}` es vacío válido por contrato/fixture (no captura actual) y `[]` array vacío legítimo. | `UNRUN`; precisión D1/H; no introduce una regla financiera. |
| AC09-E | Foto con todos los bloques `Completo`, sin regla aditiva aprobada. | `cobertura.totalPeriodo:null`, `valores.totalPeriodo:null` y `motivoTotal:"SIN_REGLA_ADITIVA"`; no se certifica total. | `UNRUN`; no introduce una regla financiera. |
| AC09-F | Cambiar T2/T3 o un motor vivo después de la foto; consultar el agregado anterior. | El agregado no cambia; ningún bloque ausente se completa desde el motor vivo. | `UNRUN`; refuerza AC01/AC09 sin reutilizar su evidencia. |
| AC09-G | Foto E4.10 v2 con `auxiliares.anticipos`, `auxiliares.compartidos`, `auxiliares.nomina`, `auxiliares.revisionComida` o `auxiliares.deuda` en `noDisponible`; generar agregado. | Las claves no canónicas se conservan con su `bloque`, `estado` y `motivo`, sin `codigoAusencia` sintético; no se descartan al iterar el conjunto canónico. | `UNRUN`; F1. |
| AC09-H | Leer un agregado persistido con `no_disponible` JSON `null` (no SQL `NULL`: columna `NOT NULL`) y, por separado, con JSON `[]`. | JSON `null` → `noDisponible:null` (ausencia no certificada); JSON `[]` → `noDisponible:[]` (vacío declarado). No se inyecta centinela, no se reescribe la fila, no se recalcula y el total sigue `null`. | `UNRUN`; F3; SQL `NULL` no aplica. |
| AC09-I | Periodo con un ciclo incluido y dos excluidos (sin cierre y pendiente de re-cierre). | `cobertura.bloques[]` tiene tres entradas, una por ciclo, con estado/motivo de cada uno; no solo el incluido. | `UNRUN`; F4; coherente con AC08. |
| AC09-J | `noDisponible` con una entrada con motivo persistido (canónica o no) y otra sintética. | La persistida conserva motivo/estado sin `codigoAusencia`; la sintética lleva el código que corresponda; no se mezclan. | `UNRUN`; F5. |

### Impacto en pruebas existentes de #300 (F2)

`[PROPUESTA]` La precisión D1/H **cambia tres expectativas de #300**. Se anclan por nombre
de prueba; las líneas son solo referencia secundaria. No se editan pruebas aquí; se
enumeran para el cambio de producto/QA:

| Prueba / expectativa | Cambia | Motivo |
| --- | --- | --- |
| `E4.11 I3 AC09: bloque null en totales conserva motivo y no sintetiza 0` (línea 655), `expect(periodo.noDisponible).toEqual([])` | **Sí** | La prueba pasa `noDisponible:null` como 7.º argumento de `seedClosure` (no `{}`). El agregado nuevo incluye el centinela `bloque:"no_disponible"` con `codigoAusencia:"NULO_EXPLICITO"`; la cobertura `Parcial` por `hechos`/`plan` no cambia. |
| `E4.11 I3 AC09: cobertura y no_disponible null declaran el bloque NoDisponible con motivo` (línea 695), `expect(periodo.noDisponible).toEqual([])` | **Sí, fixture/legacy** | `noDisponible:null` produce el centinela `bloque:"no_disponible"` con `codigoAusencia:"NULO_EXPLICITO"`; no es un estado alcanzable por el contrato. |
| `E4.11 I3 AC09: no_disponible con bloque null conserva el motivo del bloque` (línea 728) | **Sí** | `valoracion:null` (entrada `null` dentro de objeto) recibe `codigoAusencia:"NULO_EXPLICITO"`; `conciliaciones` conserva `estado`/motivo persistido y **no** recibe código sintético. |
| Fixtures/asserts con `{}` o arrays con entradas (`e411-periodo.test.ts`, `e411-contraste.test.ts`), incluida `E4.11 I3 AC09: ausencia no se sintetiza como 0 ni como total` (afirma sobre `valores.porCiclo[0].noDisponible`, no sobre el agregado) | **No** | `{}` y los arrays con entradas no son ausencia; se conserva la salida actual. `{}` es válido por contrato/fixture, no captura actual. |
| Lectura de agregado persistido con JSON `null` | **No cambia `filaADto`**: devuelve `null` | AC09-H lo fija como `noDisponible:null`; no se normaliza a `[]` ni se inyecta centinela. No hay prueba existente que lo cubra. |
| Lectura con JSON `[]` | **No** | Se conserva `[]` como vacío declarado. |
| SQL `NULL` | **No aplica** | `no_disponible` es `TEXT NOT NULL`; no se prueba ni se representa. |

`[PROPUESTA]` El ejemplo mínimo de §6.2 (`"noDisponible": []`) no es el contrato completo
de AC09; §18 prevalece (F8). Las claves no canónicas y los motivos persistidos se conservan
sin `codigoAusencia` sintético (AC09-G/J).

### Límite de la enmienda

- La enmienda es **documental**: no implementa la iteración del conjunto canónico, el campo
  `codigoAusencia` ni los cambios de UI/tests. El paquete de producto debe incluir una
  guarda de UI para lectura `noDisponible:null` (no recorrerlo como array; rotular «no
  informado»).
- La corrección de producto se aplicaría **solo a agregados nuevos**; no se reescriben
  fotos E4.9/E4.10 ni `fotos_periodo` existentes.
- Los agregados antiguos que no distingan los casos conservan su JSON y siguen `Parcial`
  sin certificar total. La lectura conserva JSON `null` como `noDisponible:null` y JSON
  `[]` como `[]`; SQL `NULL` no existe porque la columna es `TEXT NOT NULL`.
- AC09-D1/D2 son casos defensivos de fixture/legacy: no acreditan un estado de producto ni
  convierten AC09 en PASS.
- AC09 sigue `PARCIAL (fixtures) · BLOCKED real`; los casos A–J y D3 quedan `UNRUN` hasta
  que exista producto autorizado y QA independiente.
