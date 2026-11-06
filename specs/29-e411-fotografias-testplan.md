# 29 — E4.11 Fotografías de ciclo/trimestre/año consultables: Test plan

Specification: [29-e411-fotografias-specification.md](29-e411-fotografias-specification.md)

Status: **DRAFT — decisiones funcionales aprobadas; pendiente aprobación formal; no autoriza DEV ni merge. Todos los AC `UNRUN`.**
No hay implementación, endpoints, migración, CI ni datos reales. Las decisiones M1–M6 están
aprobadas: P1-C/P4-A/P5-B, P2-A, P3-B, P6-A, P7-D y P8a-A/P8b-A (2026-11-06).
Base: `main` `025adf8` (2026-11-06); E4.9 `0176ffc`; E4.10 I1–I4 integrados e I5 en PR.

Este testplan no declara PASS. La política de composición queda fijada por las decisiones
aprobadas; no se reinterpreta en la ejecución.

## Matriz de aceptación

| Acceptance ID | Precondiciones y acción | Resultado esperado | Método/comando propuesto | Plataforma/owner | Evidencia esperada | Estado actual | Candidato/fecha |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E4.11-AC01 | Fixture con ciclo cerrado y foto v1; aplicar T2 (clasificación/referencias/plan vivo) y T3 (renombrar) después del cierre; consultar foto y cálculo vivo del mismo ciclo. | Foto devuelve los valores persistidos al cierre; vista viva devuelve otros valores, rotulada `CalculoVivo` con motor y `revision`; ninguna cifra de la foto cambia. | Bun Test de contrato + snapshot SQLite antes/después de T2/T3 | Documental; API/UI futura (E4.11 · DEV) | Foto v1, DTO vivo, snapshot y diff | UNRUN — diseño | — |
| E4.11-AC02 | Consultar metadatos de la foto antes y después de T2/T3. | Ciclo, versión, UTC, actor, motivo, fingerprint, versión de app/esquema y ventana `[inicio, fin]` visibles e idénticos; sin recálculo. | Bun Test de contrato de metadatos | Documental; API futura | DTO de identidad y comparación byte a byte | UNRUN — diseño | — |
| E4.11-AC03 | Fixture con v1 y v2 (cuando E4.10 exista); seleccionar v1 explícitamente y luego v2. | Cada consulta devuelve exactamente la versión solicitada con `seleccionAplicada`; la otra sigue consultable e intacta. Sin E4.10: v1 es la única y la respuesta lo declara. | Bun Test de selección de versión + Playwright del selector | Documental; API/UI futura | Dos DTO y captura 390/1440 del selector | UNRUN — diseño | — |
| E4.11-AC04 | Consultar un trimestre y un año con varios ciclos cerrados. | Cada cifra agregada referencia las fotos de ciclo que la componen (ciclo, versión, fingerprint) y la regla de composición; ninguna cifra proviene de motores vivos. | Bun Test de composición + snapshot | Documental; API futura | DTO de composición y traza a fotos | UNRUN — diseño | — |
| E4.11-AC05 | Periodo con ciclos en versiones distintas y/o un ciclo reabierto. (P1-C/P4-A/P5-B) | La respuesta declara por ciclo versión usada, inclusión/exclusión y motivo; la mezcla se permite con composición exacta; el reabierto se excluye/marca; no hay composición silenciosa. | Bun Test de política parametrizada (casos A/B/C de M1) | Documental; API futura | DTO con `composicion[]` completa y motivo de bloqueo | UNRUN — diseño | — |
| E4.11-AC06 | Ciclo reabierto sin v2 (cuando E4.10 exista). (M1/P4) | Según política: excluido y marcado `PendienteReCierre`, o última versión cerrada marcada; v1 nunca se presenta como vigente sin marca; no se crea foto. | Bun Test + Playwright del estado y del badge | Documental; API/UI futura | DTO de estado, badge y ausencia de foto nueva | UNRUN — diseño | — |
| E4.11-AC07 | Generar/consultar un agregado de trimestre/año y después re-cerrar un ciclo creando v2; volver a consultar el agregado anterior y generar uno nuevo. (P2-A/P6-A) | El agregado anterior devuelve los mismos valores y versiones; no se recalcula. El nuevo declara las versiones nuevas. | Bun Test de congelación/determinismo + snapshot | Documental; API futura | Dos DTO de agregado y snapshot sin cambios en el primero | UNRUN — diseño | — |
| E4.11-AC08 | Desde una cifra de periodo, navegar a los ciclos componentes (incluidos y excluidos). | Cada incluido devuelve su foto y cobertura; cada excluido figura con motivo (sin cierre, pendiente, fuera de periodo). | Bun Test de drill-down + Playwright | Documental; API/UI futura | DTO por ciclo y capturas 390/1440 | UNRUN — diseño | — |
| E4.11-AC09 | Periodo con un ciclo sin cierre, un hueco o una fuente `No disponible`. | `Parcial`/`NoDisponible` con motivo por bloque; ningún total parcial se declara completo ni se sustituye por `0`. | Bun Test de estados de cobertura + Playwright | Documental; API/UI futura | DTO de cobertura y captura del total «parcial» | UNRUN — diseño | — |
| E4.11-AC10 | Ejercicio con solo archivo E4.5 y sin fotos. (P8b-A) | El primer desarrollo **excluye** el archivo E4.5: no hay ruta ni `tipoRegistro=Archivo`; no se crea foto, cierre ni plan. Consulta separada diferida. | Bun Test de contrato E4.5/E4.11 + snapshot | Documental; API/UI futura | DTO con `tipoRegistro`, snapshot sin altas | UNRUN — diseño | — |
| E4.11-AC11 | Consultar fotos y periodos de 2026; crear el ejercicio 2027 y volver a consultar 2026. (M3) | Valores, versiones y cortes de 2026 se conservan; no se reetiquetan, recalculan ni borran; la transición no mezcla ejercicios sin declararlo. | Bun Test de continuidad + snapshot antes/después | Documental; API/UI futura | DTO 2026 pre/post y snapshot | UNRUN — diseño | — |
| E4.11-AC12 | `POST`/`PATCH`/`DELETE` sobre fotos o periodos. | 405/422; no se crea, rectifica ni borra foto. Excepción única: creación del agregado P2-A, con ruta y clave propias. | Bun Test de rutas y verbos | Documental; API futura | Respuestas y snapshot sin cambios | UNRUN — diseño | — |
| E4.11-AC13 | Intentar rectificar un ciclo antiguo o consultar una «foto corregida» por DT9. (M6/P8) | No existe ruta; rechazo con motivo; E4.11 no habilita DT9. | Bun Test negativo + revisión de rutas | Documental; API futura | 404/405 con motivo y ausencia de endpoint | UNRUN — diseño | — |
| E4.11-AC14 | Consultar un periodo futuro y un ciclo sin cierre. | Periodo futuro: 422 con campo/motivo. Ciclo sin cierre: `SinFoto` con motivo. Ninguno devuelve `0` ni foto vacía. | Bun Test de validación + Playwright de estados | Documental; API/UI futura | DTO de error y captura del estado vacío | UNRUN — diseño | — |
| E4.11-AC15 | Consultar una foto con bloques E4.3/E4.2/E4.4 `No disponible`, con motores vivos disponibles. | El bloque se muestra `No disponible` con motivo; no se completa desde el motor vivo ni se declara completo el total. | Bun Test de contrato de bloques + snapshot | Documental; API futura | DTO con `noDisponible[]` y total no certificado | UNRUN — diseño | — |

## Casos obligatorios del roadmap

| Caso del roadmap | Fila(s) | Qué debe demostrar |
| --- | --- | --- |
| Valores actuales ≠ foto | E4.11-AC01, E4.11-AC02 | La foto no se mueve al cambiar T2/T3; lo vivo se etiqueta y se separa. |
| Selección explícita de versión anterior | E4.11-AC03, E4.11-AC08 | v1 y v2 consultables e intactas; el selector no cambia de versión en silencio. |
| Trimestre/año tras re-cierre | E4.11-AC05, E4.11-AC06, E4.11-AC07 | La composición se declara; el agregado anterior queda congelado/determinista y no se recalcula. |
| Continuidad entre ejercicios | E4.11-AC11 | 2026 sigue consultable en 2027, sin reetiquetar ni borrar. |

## Decisiones aprobadas aplicables

| Decisión | Filas afectadas | Regla aprobada |
| --- | --- | --- |
| M1 (P1-C/P4-A/P5-B) | AC05, AC06, AC07 | Composición declarada, reabierto marcado, mezcla registrada. |
| M2 (P2-A) | AC04, AC07, AC12 | Agregado persistido, versionado e inmutable. |
| M3 (P3-B) | AC04, AC11 | Periodos por ciclos financiados, mes financiado, sin prorrateo. |
| M4 (P6-A) | AC07, AC11 | Retención permanente de fotos y agregados. |
| M5 (P7-D) | AC01, AC03, AC08 | Consulta combinada ciclo/trimestre/año con selector explícito. |
| M6 (P8a-A/P8b-A) | AC10, AC13 | DT9 fuera; archivo E4.5 excluido del primer desarrollo. |

## Dependencias que bloquean la ejecución

- **E4.9:** integrado `0176ffc` con QA APTO CON RESERVAS; contrato de foto estable.
  `UNRUN — diseño`.
- **E4.10:** I1–I4 integrados (v26, reapertura, guardas, re-cierre); I5 en PR. AC03/AC06/AC07
  pueden construirse con fixtures de v1/v2. `UNRUN — diseño`.
- **E4.5 (SPEC20):** excluido del primer desarrollo por P8b-A; AC10 no aplica y AC15 no usa
  archivo. `UNRUN — fuera de alcance`.
- **DT6/T-BKP:** abierto; el cierre real no se ejecuta. Los AC se diseñan con fixtures
  sintéticos y se marcarán `PASS (fixtures)` / `BLOQUEADO (real)` cuando exista DEV.
- **DT9:** no habilitado; AC13 se diseña como caso negativo.

## Regression checks

`UNRUN`. No hay implementación ni suite de E4.11. Cuando exista DEV, se proponen:
`bun run test`, `bun run test:e2e` y `python3 scripts/verify` sobre el candidato, con
resultados reales por comando. No se reutiliza evidencia de E4.9/E4.10 como si fuera de
E4.11.

## Functional verification

`UNRUN`. No hay endpoints, DTO ni consulta implementados. El contrato del §6 de la SPEC es
conceptual y fijado por M1–M6 aprobadas.

## Browser verification

`UNRUN`. No hay wireframes aprobados (DT8) ni capturas 390/1440. Cuando exista UI, se
verificará: selector de periodo/versión, badge de origen, panel de cobertura y
composición, drill-down y estados vacío/carga/error, sin `0` por ausencia.

## Datos y fixtures

`[PROPUESTA]` Solo datos ficticios y deterministas: ciclos cerrados con foto v1, un ciclo
reabierto sin v2, un re-cierre con v2, un periodo mixto, un ciclo sin cierre y un ejercicio
con archivo E4.5. Prohibido usar datos reales, bases privadas, credenciales o secretos.
Los fixtures no acreditan DT6 ni DT7.

## Limitations and next action

- Ningún AC ejecutado; las decisiones funcionales están aprobadas y el diseño queda fijado.
- La política de agregación y la versión canónica están fijadas por M1–M6 aprobadas.
- E4.9/E4.10 I1–I4 están integrados; I5 sigue en PR. Los fixtures de v1/v2 pueden construirse.
- Próxima acción independiente: aprobación formal de SPEC29 y testplan; después, autorización DEV separada.
