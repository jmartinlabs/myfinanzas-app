# 29 — E4.11 Fotografías de ciclo/trimestre/año consultables: Test plan

Specification: [29-e411-fotografias-specification.md](29-e411-fotografias-specification.md)

Status: **APROBADO — 2026-11-06.** Aprobación formal del usuario; merge documental #242 `6fe91d7`.
Ejecución funcional con fixtures registrada el 2026-11-07: **10 `PASS (fixtures)`, 5 `PARCIAL`
y 15 dimensiones de datos reales `BLOCKED real`**; no declara aceptación global ni PASS de
aceptación. Las definiciones siguen congeladas. DEV autorizado por separado el 2026-11-06.
Los datos de ejecución son fixtures sintéticos; no se usan datos reales. Las decisiones M1–M6
están aprobadas: P1-C/P4-A/P5-B, P2-A, P3-B, P6-A, P7-D y P8a-A/P8b-A (2026-11-06). Base:
`main` `eca4e23` (2026-11-06); E4.9 `0176ffc`; E4.10 I1–I6 integrados; candidato de
aceptación `c7a480f` (2026-11-07). Enmienda de alcance aprobada por el usuario el
**2026-11-08** (transmitida por el coordinador): AC08 se alinea con P3-B sin
`FueraDePeriodo` y AC15 se acota a E4.3/E4.4 con E4.2 como cobertura pendiente. Los
estados por AC y las definiciones congeladas no cambian; la enmienda no declara aceptación.

Este testplan distingue `PASS (fixtures)` de aceptación: no declara aceptación global ni
cierre financiero real. La política de composición queda fijada por las decisiones aprobadas;
no se reinterpreta en la ejecución.

## Matriz de aceptación

Estados asignados según la matriz AC → evidencia → límite del informe
[`e411-acceptance-2026-11-07.md`](investigations/e411-acceptance-2026-11-07.md) (2026-11-07).
Cada AC conserva además la dimensión de datos reales `BLOCKED real`; `PASS (fixtures)` no es
aceptación global.

| Acceptance ID | Precondiciones y acción | Resultado esperado | Método/comando propuesto | Plataforma/owner | Evidencia esperada | Estado actual | Candidato/fecha |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E4.11-AC01 | Fixture con ciclo cerrado y foto v1; aplicar T2 (clasificación/referencias/plan vivo) y T3 (renombrar) después del cierre; consultar foto y cálculo vivo del mismo ciclo. | Foto devuelve los valores persistidos al cierre; vista viva devuelve otros valores, rotulada `CalculoVivo` con motor y `revision`; ninguna cifra de la foto cambia. | Bun Test de contrato + snapshot SQLite antes/después de T2/T3 | Documental; API/UI futura (E4.11 · DEV) | Foto v1, DTO vivo, snapshot y diff | PARCIAL (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC02 | Consultar metadatos de la foto antes y después de T2/T3. | Ciclo, versión, UTC, actor, motivo, fingerprint, versión de app/esquema y ventana `[inicio, fin]` visibles e idénticos; sin recálculo. | Bun Test de contrato de metadatos | Documental; API futura | DTO de identidad y comparación byte a byte | PARCIAL (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC03 | Fixture con v1 y v2 (con E4.10 I1–I5 integrados); seleccionar v1 explícitamente y luego v2. | Cada consulta devuelve exactamente la versión solicitada con `seleccionAplicada`; la otra sigue consultable e intacta.  | Bun Test de selección de versión + Playwright del selector | Documental; API/UI futura | Dos DTO y captura 390/1440 del selector | PASS (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC04 | Consultar un trimestre y un año con varios ciclos cerrados. | Cada cifra agregada referencia las fotos de ciclo que la componen (ciclo, versión, fingerprint) y la regla de composición; ninguna cifra proviene de motores vivos. | Bun Test de composición + snapshot | Documental; API futura | DTO de composición y traza a fotos | PASS (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC05 | Periodo con ciclos en versiones distintas y/o un ciclo reabierto. (P1-C/P4-A/P5-B) | La respuesta declara por ciclo versión usada, inclusión/exclusión y motivo; la mezcla se permite con composición exacta; el reabierto se excluye/marca; no hay composición silenciosa. | Bun Test de composición P1-C/P4-A/P5-B | Documental; API futura | DTO con `composicion[]` completa y motivo | PASS (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC06 | Ciclo reabierto sin v2 (E4.10 I2 integrado). (P1-C/P4-A) | Excluido y marcado `PendienteReCierre`; v1 consultable pero no vigente sin advertencia; no se crea foto. | Bun Test + Playwright del estado y del badge | Documental; API/UI futura | DTO de estado, badge y ausencia de foto nueva | PASS (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC07 | Generar/consultar un agregado de trimestre/año y después re-cerrar un ciclo creando v2; volver a consultar el agregado anterior y generar uno nuevo. (P2-A/P6-A) | El agregado persistido anterior devuelve los mismos valores y versiones; no se recalcula. El nuevo declara las versiones nuevas. | Bun Test de agregado persistido P2-A + snapshot | Documental; API futura | Dos DTO de agregado y snapshot sin cambios en el primero | PASS (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC08 | Desde una cifra de periodo, navegar a los ciclos componentes (incluidos y excluidos). | Cada incluido devuelve su foto y cobertura; cada excluido figura con motivo (sin cierre, pendiente de re-cierre). Un ciclo fuera del periodo no compone ni se enumera como contexto: P3-B lo atribuye íntegro a su propio periodo por `mes_financiado`. | Bun Test de drill-down + Playwright | Documental; API/UI futura | DTO por ciclo y capturas 390/1440 | PARCIAL (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC09 | Periodo con un ciclo sin cierre, un hueco o una fuente `No disponible`. | `Parcial`/`NoDisponible` con motivo por bloque; ningún total parcial se declara completo ni se sustituye por `0`. | Bun Test de estados de cobertura + Playwright | Documental; API/UI futura | DTO de cobertura y captura del total «parcial» | PARCIAL (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC10 | Ejercicio con solo archivo E4.5 y sin fotos. (P8b-A) | El primer desarrollo excluye el archivo E4.5: no hay ruta ni `tipoRegistro=Archivo`; no se crea foto, cierre ni plan. Consulta separada diferida. | Bun Test negativo de ausencia de ruta + snapshot | Documental; API futura | Sin ruta/tipoRegistro; snapshot sin altas | PASS (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC11 | Consultar fotos y periodos de 2026; crear el ejercicio 2027 y volver a consultar 2026. (P3-B) | Valores, versiones y cortes de 2026 se conservan; no se reetiquetan, recalculan ni borran; la transición no mezcla ejercicios sin declararlo. | Bun Test de continuidad + snapshot antes/después | Documental; API/UI futura | DTO 2026 pre/post y snapshot | PASS (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC12 | `POST`/`PATCH`/`DELETE` sobre fotos o periodos. | 405/422; no se crea, rectifica ni borra foto. Excepción única: creación del agregado P2-A, con ruta y clave propias. | Bun Test de rutas y verbos | Documental; API futura | Respuestas y snapshot sin cambios | PASS (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC13 | Intentar rectificar un ciclo antiguo o consultar una «foto corregida» por DT9. (P8a-A) | No existe ruta; rechazo con motivo; E4.11 no habilita DT9. | Bun Test negativo + revisión de rutas | Documental; API futura | 404/405 con motivo y ausencia de endpoint | PASS (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC14 | Consultar un periodo futuro y un ciclo sin cierre. | Periodo futuro: 422 con campo/motivo. Ciclo sin cierre: `SinFoto` con motivo. Ninguno devuelve `0` ni foto vacía. | Bun Test de validación + Playwright de estados | Documental; API/UI futura | DTO de error y captura del estado vacío | PASS (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |
| E4.11-AC15 | Consultar una foto con bloques E4.3/E4.4 `No disponible`, con motores vivos disponibles. | El bloque se muestra `No disponible` con motivo; no se completa desde el motor vivo ni se declara completo el total. | Bun Test de contrato de bloques + snapshot | Documental; API futura | DTO con `noDisponible[]` y total no certificado | PARCIAL (fixtures) · BLOCKED real | c7a480f · 2026-11-07 |

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
  negativo y AC15 queda `PARCIAL`. E4.5 sigue fuera de alcance (`UNRUN`).
- **DT6/T-BKP:** abierto; el cierre real sigue `BLOCKED real`. Los AC se ejecutaron con
  fixtures sintéticos el 2026-11-07: 10 `PASS (fixtures)` y 5 `PARCIAL`.
- **DT9:** no habilitado; AC13 se diseña como caso negativo.

## Regression checks

La suite E4.11 existe y se ejecutó: `bun test apps/api/src/e411*.test.ts` **36 pass / 0 fail**
y full Linux `42415751714` PASS (incluye E2E I6). No hay una tabla de regresión por fila
ejecutada; esos casos conservan `UNRUN`. No se reutiliza evidencia de E4.9/E4.10 como si fuera
de E4.11.

## Functional verification

Ejecutada con fixtures (2026-11-07): 10 `PASS (fixtures)` y 5 `PARCIAL`; 15 dimensiones de
datos reales `BLOCKED real`. No hay aceptación global ni validación con datos reales. Evidencia:
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

- Ejecución funcional con fixtures registrada (10 `PASS (fixtures)`, 5 `PARCIAL`); ningún AC
  validado con datos reales. Las 15 dimensiones reales siguen `BLOCKED real`.
- La política de agregación y la versión canónica están fijadas por M1–M6 aprobadas.
- E4.9/E4.10 I1–I5 están integrados; los fixtures de v1/v2 se ejecutaron.
- Las reservas AC01/AC02/AC08/AC09/AC15 y la validación con datos reales siguen pendientes; el
  veredicto de aceptación corresponde al usuario/QA.
