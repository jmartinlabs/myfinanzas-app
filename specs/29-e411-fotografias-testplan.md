# 29 — E4.11 Fotografías de ciclo/trimestre/año consultables: Test plan

Specification: [29-e411-fotografias-specification.md](29-e411-fotografias-specification.md)

Status: **DRAFT — no aprobada; no autoriza DEV ni merge. Todos los AC `UNRUN`.**
No hay implementación, endpoints, migración, CI ni datos reales. El diseño es
**provisional**: los resultados dependen de las decisiones M1–M6 (P1–P8) y del merge/QA de
E4.9 (PR #200, OPEN/draft según la investigación de alcance del 2026-11-04).
Base: rama `docs/next-packages`, base `eefc20d` (2026-11-04).

Este testplan no declara PASS ni anticipa la política de composición. Si cambia una
decisión M, cambia la fila parametrizada, no el AC.

## Matriz de aceptación

| Acceptance ID | Precondiciones y acción | Resultado esperado | Método/comando propuesto | Plataforma/owner | Evidencia esperada | Estado actual | Candidato/fecha |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E4.11-AC01 | Fixture con ciclo cerrado y foto v1; aplicar T2 (clasificación/referencias/plan vivo) y T3 (renombrar) después del cierre; consultar foto y cálculo vivo del mismo ciclo. | Foto devuelve los valores persistidos al cierre; vista viva devuelve otros valores, rotulada `CalculoVivo` con motor y `revision`; ninguna cifra de la foto cambia. | Bun Test de contrato + snapshot SQLite antes/después de T2/T3 | Documental; API/UI futura (E4.11 · DEV) | Foto v1, DTO vivo, snapshot y diff | UNRUN — diseño | — |
| E4.11-AC02 | Consultar metadatos de la foto antes y después de T2/T3. | Ciclo, versión, UTC, actor, motivo, fingerprint, versión de app/esquema y ventana `[inicio, fin]` visibles e idénticos; sin recálculo. | Bun Test de contrato de metadatos | Documental; API futura | DTO de identidad y comparación byte a byte | UNRUN — diseño | — |
| E4.11-AC03 | Fixture con v1 y v2 (cuando E4.10 exista); seleccionar v1 explícitamente y luego v2. | Cada consulta devuelve exactamente la versión solicitada con `seleccionAplicada`; la otra sigue consultable e intacta. Sin E4.10: v1 es la única y la respuesta lo declara. | Bun Test de selección de versión + Playwright del selector | Documental; API/UI futura | Dos DTO y captura 390/1440 del selector | UNRUN — diseño | — |
| E4.11-AC04 | Consultar un trimestre y un año con varios ciclos cerrados. | Cada cifra agregada referencia las fotos de ciclo que la componen (ciclo, versión, fingerprint) y la regla de composición; ninguna cifra proviene de motores vivos. | Bun Test de composición + snapshot | Documental; API futura | DTO de composición y traza a fotos | UNRUN — diseño | — |
| E4.11-AC05 | Periodo con ciclos en versiones distintas y/o un ciclo reabierto. (M1) | La respuesta declara por ciclo versión usada, inclusión/exclusión y motivo; no hay composición silenciosa; si la política prohíbe la mezcla, se bloquea con motivo. | Bun Test de política parametrizada (casos A/B/C de M1) | Documental; API futura | DTO con `composicion[]` completa y motivo de bloqueo | UNRUN — diseño | — |
| E4.11-AC06 | Ciclo reabierto sin v2 (cuando E4.10 exista). (M1/P4) | Según política: excluido y marcado `PendienteReCierre`, o última versión cerrada marcada; v1 nunca se presenta como vigente sin marca; no se crea foto. | Bun Test + Playwright del estado y del badge | Documental; API/UI futura | DTO de estado, badge y ausencia de foto nueva | UNRUN — diseño | — |
| E4.11-AC07 | Generar/consultar un agregado de trimestre/año y después re-cerrar un ciclo creando v2; volver a consultar el agregado anterior y generar uno nuevo. (M1–M2) | El agregado anterior devuelve los mismos valores y versiones; no se recalcula. El nuevo declara las versiones nuevas. | Bun Test de congelación/determinismo + snapshot | Documental; API futura | Dos DTO de agregado y snapshot sin cambios en el primero | UNRUN — diseño | — |
| E4.11-AC08 | Desde una cifra de periodo, navegar a los ciclos componentes (incluidos y excluidos). | Cada incluido devuelve su foto y cobertura; cada excluido figura con motivo (sin cierre, pendiente, fuera de periodo). | Bun Test de drill-down + Playwright | Documental; API/UI futura | DTO por ciclo y capturas 390/1440 | UNRUN — diseño | — |
| E4.11-AC09 | Periodo con un ciclo sin cierre, un hueco o una fuente `No disponible`. | `Parcial`/`NoDisponible` con motivo por bloque; ningún total parcial se declara completo ni se sustituye por `0`. | Bun Test de estados de cobertura + Playwright | Documental; API/UI futura | DTO de cobertura y captura del total «parcial» | UNRUN — diseño | — |
| E4.11-AC10 | Ejercicio con solo archivo E4.5 y sin fotos. (M6) | La UI/API muestra `Archivo` (`tipoRegistro=Archivo`), no `Foto`; no se crea foto, cierre ni plan; el archivo no compone un total de foto. | Bun Test de contrato E4.5/E4.11 + snapshot | Documental; API/UI futura | DTO con `tipoRegistro`, snapshot sin altas | UNRUN — diseño | — |
| E4.11-AC11 | Consultar fotos y periodos de 2026; crear el ejercicio 2027 y volver a consultar 2026. (M3) | Valores, versiones y cortes de 2026 se conservan; no se reetiquetan, recalculan ni borran; la transición no mezcla ejercicios sin declararlo. | Bun Test de continuidad + snapshot antes/después | Documental; API/UI futura | DTO 2026 pre/post y snapshot | UNRUN — diseño | — |
| E4.11-AC12 | `POST`/`PATCH`/`DELETE` sobre fotos o periodos. | 405/422; no se crea, rectifica ni borra foto. Excepción única: creación del agregado si M2-A, con ruta y clave propias. | Bun Test de rutas y verbos | Documental; API futura | Respuestas y snapshot sin cambios | UNRUN — diseño | — |
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

## Parametrización por decisiones pendientes

| Decisión | Filas que dependen | Qué falta para poder ejecutarlas |
| --- | --- | --- |
| M1 (P1/P4/P5) | AC05, AC06, AC07 | Respuesta del usuario sobre versión por ciclo, reabierto sin v2 y mezcla. |
| M2 (P2) | AC04, AC07 | Definir si el agregado es persistido, determinista o híbrido. |
| M3 (P3) | AC04, AC11 | Definir periodo, frontera del ciclo que cruza y transición. |
| M4 (P6) | AC07, AC11 | Confirmar retención del agregado (las fotos ya son permanentes por DT4). |
| M5 (P7) | AC01, AC03, AC08 | Definir consulta prioritaria y presencia del selector de versión/origen. |
| M6 (P8/archivo) | AC10, AC13 | Confirmar DT9 fuera y si el archivo E4.5 se muestra separado o se excluye. |

## Dependencias que bloquean la ejecución

- **E4.9 (PR #200):** OPEN/draft según la investigación de alcance; sin merge ni QA
  registrada. Sin contrato de foto estable no hay fixture válido para AC01–AC15.
  `UNRUN — bloqueado`.
- **E4.10 (SPEC28):** no iniciada; AC03, AC06 y AC07 no tienen v2 real. Se podrán simular
  con fixtures solo si la SPEC de E4.10 fija la semántica de versión. `UNRUN — bloqueado`.
- **E4.5 (SPEC20):** DEV no autorizado y DT7 pendiente; AC10 y la parte de archivo de
  AC15 quedan sin fuente real. `UNRUN — bloqueado` (salvo fixture sintético de contrato).
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
conceptual y está parametrizado por M1–M6.

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

- Ningún AC aprobado ni ejecutado; este documento es diseño provisional.
- La política de agregación y la versión canónica **no** están fijadas: quedan en M1–M6.
- E4.9 sin merge/QA y E4.10 sin SPEC impiden construir fixtures definitivos.
- Próxima acción independiente: el coordinador debe obtener del usuario las decisiones
  M1–M6 (o al menos M1–M3) y confirmar el estado de E4.9/E4.10 antes de proponer DEV.
