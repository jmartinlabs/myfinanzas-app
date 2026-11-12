# 30 — E4.12 Ensayo integral de recuperación y equivalencia: Test plan

Specification: [30-e412-recuperacion-specification.md](30-e412-recuperacion-specification.md)

Status: **F0 APROBADA — 2026-11-09. F1 IN_PROGRESS (documental).** Aprobación explícita e
identificable del usuario al marco documental —este testplan, la specification, los 17 AC,
los niveles A/B y los gates independientes—, registrada el 2026-11-09. F0 = `PASS`/`DONE`
(gate documental); no es PASS de ningún AC ni aceptación de E4.12. F1 = `IN_PROGRESS`;
F2/F3/F4 = `UNRUN`.
Approval source/date: **2026-11-09 — usuario**; revisión de Álex no registrada.
Base del borrador: `test` `7477e86` (2026-11-08); revisión F0/F1: `test` `2e5de7c`
(2026-11-09), rama `docs/e412-f1`; contrato vigente
`schemaVersion=27`/`C27-E411-FOTOS-PERIODO`.
No hay implementación, migración, ensayo ni datos reales; el CI full de esta entrega está pendiente. El ensayo no
está autorizado y este documento no declara PASS de AC.

`[CONFIRMADO]` Este test plan describe **qué evidencia demostraría cada criterio**, no el
procedimiento operativo. Los comandos, rutas, plazos y umbrales concretos deben acordarse y
registrarse en la fase de preparación (F2) antes de ejecutar; no se inventan aquí.

`[CONFIRMADO]` La aprobación F0 fija el marco y los 17 AC como criterios; no ejecuta
ninguno. `[PROPUESTA]` Las propuestas de F1 para las nueve decisiones viven en la
specification §9 y **no son decisiones**; este testplan no las duplica ni las convierte en
autorización.

---

## Matriz de aceptación

| Acceptance ID | Precondiciones y acción | Resultado esperado | Método (tipo de evidencia) | Entorno | Owner | Evidencia esperada | Estado | Bloqueo vigente / nivel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E4.12-AC01 | Copia ficticia coherente con su WAL y destino nuevo aislado; restaurar y abrir la copia. | La copia abre con el contrato de app/esquema de su versión, sin downgrade ni reset; manifiesto, checksum, integridad, FK y esquema concuerdan. | Comparación pre/post de identidad y metadatos; apertura real; negativo con copia corrupta. | Linux x86_64 aislado (o exclusión declarada); sin PROD | Ejecutor autorizado (por designar) | Manifiesto, SHA-256, DTO de identidad pre/post, resultado de apertura y log crudo | `UNRUN` | Nivel A: copia sintética. Nivel B: DT6/custodia externa |
| E4.12-AC02 | Inventariar IDs del corte antes del restore; restaurar; repetir inventario y dar de alta una entidad nueva. | IDs estables, únicos y no reutilizados; el alta nueva recibe un ID que no ocupa ningún hueco. | Diff de IDs por entidad y recuentos; alta posterior. | Entorno aislado; API/CLI sobre la copia | Ejecutor autorizado | Listado/diff de IDs, recuentos y alta posterior | `UNRUN` | Nivel A: fixture integral (F2). Nivel B: DT6 |
| E4.12-AC03 | Comparar aperturas, Saldos y Deudas antes/después; comprobar que no aparece ningún Movimiento nuevo. | Aperturas conservan su naturaleza de posición/atributo; no se convierten en Movimiento ni se duplican; Saldo/Deuda iguales. | Comparación de DTO y listado de Movimientos. | Entorno aislado | Ejecutor autorizado | DTO de aperturas/Saldos/Deudas pre/post y listado sin altas | `UNRUN` | Nivel A: fixture integral (F2). Nivel B: DT6 |
| E4.12-AC04 | Comparar vínculos y cardinalidades de transferencias, referencias, fichas y auxiliares; consultar huérfanos; navegar por API/UI. | Vínculos 1:1/1:N conservados por ID, sin recreación por nombre ni huérfanos. | Diff de relaciones, consulta de huérfanos y navegación funcional. | Entorno aislado; API/UI | Ejecutor autorizado | Diff de relaciones, cardinalidades y navegación documentada | `UNRUN` | Nivel A: cubre el resto; archivo E4.5 fuera. Nivel B: E4.5/DT7 |
| E4.12-AC05 | Editar el plan vivo sobre la copia restaurada; consultar plan final/foto antes/después. | El plan vivo sigue editable y el plan final/foto permanece congelado; la edición no altera la foto. | Comparación de DTO antes/después y snapshot de la foto. | Entorno aislado; API/UI | Ejecutor autorizado | DTO del plan pre/post y snapshot de la foto sin cambios | `UNRUN` | Nivel A: E4.9/E4.10 integrados + fixtures. Nivel B: aceptación E4.9/E4.10 |
| E4.12-AC06 | Comparar hechos y auxiliares antes/después al corte, dentro de la cobertura declarada (R4/R5). | Importe, fecha, clasificación, referencias y auxiliares conservados; sin pérdida, duplicación ni reclasificación por texto. | Diff de hechos/auxiliares y cobertura por bloque. | Entorno aislado; API | Ejecutor autorizado | Diff de hechos/auxiliares y cobertura por bloque | `UNRUN` | Nivel A: solo cobertura declarada sin E4.5. Nivel B: E4.5/DT7; reservas E3.5/E3.6 |
| E4.12-AC07 | Consultar v1 y v2 tras el restore y comparar contenido/metadatos; contrastar con el cálculo vivo etiquetado. | Fotos conservan versión, corte, metadatos, fingerprint y contenido; v1 y v2 consultables e inmutables; ninguna se confunde con recálculo actual. | Consulta explícita de versiones y diff de contenido/metadatos. | Entorno aislado; API/UI | Ejecutor autorizado | DTO v1/v2, fingerprint, diff y consulta/captura de la versión | `UNRUN` | Nivel A: E4.10 I1–I8 + E4.11 I1–I6 con fixtures. Nivel B: aceptación E4.10/E4.11 |
| E4.12-AC08 | Reutilizar sesiones/desafíos/códigos previos y realizar un login nuevo sobre la copia aislada. | Accesos previos revocados; contraseña + TOTP operativos; el login nuevo emite códigos nuevos. | Prueba de rechazo/aceptación y emisión de códigos. | Entorno aislado; API/UI | Ejecutor autorizado | Respuestas de rechazo/aceptación, emisión de códigos y log sin secretos | `UNRUN` | Nivel A: entorno aislado y claves de fixture. Nivel B: DT6/custodia |
| E4.12-AC09 | Probar copia corrupta, manifiesto/checksum/esquema manipulado, clave errónea, destino existente y antigüedad no aceptada. | Rechazo sin destino parcial ni reemplazo de copia buena; destino previo intacto. | Negativos reproducibles con hash/esquema/clave y comprobación del destino. | Entorno aislado; fixtures | Ejecutor autorizado | Exit no cero, destino previo intacto, ausencia de temporales y log crudo | `UNRUN` | Nivel A: fixtures. Nivel B: copia externa y `--allow-older` autorizados |
| E4.12-AC10 | Revisar Git, CI, logs y artefactos producidos; verificar la ruta privada de evidencias. | Cero datos reales, bases, claves o secretos publicados; evidencias fuera de Git. | Revisión de contenido/destinos e historial/diff. | Documental; entorno de ensayo | Ejecutor autorizado + QA | Inventario de artefactos, revisión de historial/diff y confirmación de ruta privada | `UNRUN` | Nivel A: revisable. Nivel B: incluye artefactos reales autorizados |
| E4.12-AC11 | Verificar manifiesto, checksum y correspondencia snapshot↔WAL de la copia de entrada. | Copia coherente con WAL; integridad/FK/esquema correctos; sin texto plano ni temporales en destino. | Verificación de manifiesto/checksum e integridad. | Entorno aislado | Ejecutor autorizado | Manifiesto, checksum, resultados de integridad/FK/esquema y origen | `UNRUN` | Nivel A: copia sintética. Nivel B: DT6/copia externa |
| E4.12-AC12 | Revisar la matriz v5.11 y congelarla por hash/fecha antes del ensayo. | Matriz con identificador, procedencia, corte, valor esperado, unidad/precisión y regla; no derivada del motor. | Revisión de matriz y procedencia; registro de congelación. | Documental; revisión del usuario/asesor | Usuario/asesor + ejecutor | Matriz versionada (fuera de Git si aplica), registro de congelación y revisión | `UNRUN` | Nivel A: solo matriz sanitizada congelada. Nivel B: DT7/AUD-06 |
| E4.12-AC13 | Contrastar cada escenario R1–R6/P1–P7 con la matriz congelada al mismo corte y clasificar diferencias. | Resultado observado frente a esperado por caso; diferencias registradas; ningún omitido se lee como correcto. | Comparación por escenario y clasificación de diferencias. | Entorno aislado; API/UI + matriz | Ejecutor autorizado | Tabla de resultados por caso, diferencias y cobertura de escenarios | `UNRUN` | Nivel A: parcial, sin equivalencia. Nivel B: AC12 y E4.5/E4.7/E4.9–E4.11 |
| E4.12-AC14 | Consolidar AC01–AC13 y el estado real de dependencias en un informe de brechas. | Listado con estado por elemento (`PASS`/`PARCIAL`/`UNRUN`/`BLOCKED`), causa, responsable y gate. | Consolidación y revisión QA del informe. | Documental | Coordinador + QA independiente | Informe de brechas trazable a caso/AC y decisión de gate P7 | `UNRUN` | Nivel A: informe parcial. Nivel B: cierre de F3 |
| E4.12-AC15 | Construir la matriz de cobertura escenario→AC→evidencia. | Los cinco escenarios del roadmap están cubiertos o declarados fuera con brecha explícita. | Matriz de cobertura y revisión de exclusiones. | Documental | Coordinador + QA | Matriz de cobertura completa con exclusiones motivadas | `UNRUN` | Nivel A: cobertura declarada. Nivel B: dependencias cerradas |
| E4.12-AC16 | Revisar candidato, versión de app/esquema, contrato y fixtures del corte; listar inclusiones/exclusiones. | Restore y oráculo usan el mismo corte; E4.5/E4.7/E4.9/E4.10/E4.11 figuran integrados, parciales o excluidos explícitamente. | Revisión documental del candidato y del corte. | Documental | Coordinador | SHA del candidato, versión de esquema, contrato y lista de inclusiones/exclusiones | `UNRUN` | Nivel A/B: SHA de `test` y v27/C27; cambio de esquema reinicia |
| E4.12-AC17 | Revisar el registro de evidencia y reproducir una muestra. | Cada resultado registra acción, entorno, candidato, base, fecha y log crudo; estados honestos; restore sintético no se presenta como operativo. | Revisión QA y reproducción de muestra. | Documental; entorno de ensayo | QA independiente | Registro de evidencia, logs crudos, revisión QA y declaración de límites | `UNRUN` | Nivel A: revisable. Nivel B: F3/F4 autorizados |

`[CONFIRMADO]` Ningún AC se declara PASS en este documento. Un `PARCIAL`, `UNRUN` u omitido
no se convierte en PASS (quality, T-QA). La columna «nivel» indica qué podría demostrarse
con fixtures (A) y qué exige el ensayo integral (B); no autoriza ninguno de los dos.

---

## Casos obligatorios del roadmap

| Caso del roadmap | Fila(s) | Qué debe demostrar |
| --- | --- | --- |
| Recuperación en limpio | AC01, AC02–AC07, AC08, AC16 | La copia coherente restaurada en destino nuevo conserva identidad, vínculos, plan, hechos, fotos y acceso. |
| Copia corrupta | AC09, AC01 | El fallo es cerrado: no hay destino parcial ni reemplazo de una copia buena. |
| Recuperación de acceso | AC08 | Contraseña + TOTP operativos; accesos previos revocados; códigos nuevos. |
| No publicación de datos/claves | AC10 | Cero datos reales o secretos en Git, CI, logs o artefactos; evidencia en carpeta privada. |
| R1–R6/P1–P7 con corte común | AC12–AC15 | Oráculo congelado e independiente; diferencias registradas; brechas explícitas para P7. |

---

## Fases y autorización

| Fase | Qué produce | Estado | Autorización |
| --- | --- | --- | --- |
| F0 · SPEC | Este testplan y la specification | **`PASS`/`DONE` (documental, 2026-11-09)** | Aprobación del usuario (cumplida) |
| F1 · Decisiones | Registro de destino, custodia, entorno, corte, matriz, evidencias, nivel A/B y alcance E4.10/E4.11 | **`IN_PROGRESS`** — propuestas en specification §9; ninguna decisión tomada | Separada de F0; cierre sujeto a decisión expresa del usuario |
| F2 · Preparación de evidencias | Fixtures integrales, copia ficticia coherente, matriz congelada, criterios por escenario, entorno aislado y SHA v27/C27 fijado | `UNRUN` | Separada de F0/F1 |
| F3 · Ensayo autorizado | Evidencia cruda por AC y escenario; la autorización declara nivel A (fixtures) o B (integral) | `UNRUN` | Explícita e identificable, con nivel y AC incluidos |
| F4 · Informe | Informe E4.12 y lista de brechas para P7; en nivel A es parcial | `UNRUN` | Separada de F3 |

`[CONFIRMADO]` La aprobación F0 (2026-11-09) no autoriza F2–F4 ni la ejecución del ensayo:
F1 queda limitada a preparar propuestas; F2/F3/F4 siguen `UNRUN` y requieren autorización
separada. Tampoco autoriza DEV, datos reales, migración, VPS ni merge. `[PROPUESTA]` Un F3
de nivel A no cierra E4.12, no sustituye al nivel B y no se presenta como recuperación
operativa ni equivalencia.

---

## Dependencias que bloquean la ejecución

`[CONFIRMADO]` El estado se leyó a `test` `7477e86` y en los informes de aceptación; no se
reaudita en F1 y el tablero no es autorización. Ninguno de los AC está ejecutado: `UNRUN`
no equivale a PASS.

| Dependencia | Estado vigente (2026-11-08) | Nivel A — fixtures | Nivel B — integral |
| --- | --- | --- | --- |
| **DT6/T-BKP** | Abierto; sin destino externo, segunda copia ni custodia de claves. Hay restore sintético v19/v20 y v27 (E4.10 AC22, CI #257) | Ruta sintética admisible | Bloquea AC01/AC11 operativos, custodia y RPO/RTO |
| **DT7** | Abierto; M3/M6 aceptadas, M9–M13 ratificadas, M1/M2/M5/M8 pendientes de evidencia | Solo estructura ficticia; sin equivalencia | Bloquea AC12/AC13/AC14 como oráculo y mapping |
| **E4.9** | Merged `0176ffc` (#200); QA APTO CON RESERVAS; aceptación pendiente; AC-09/cierre real sujetos a DT6 | Contrato de cierre/foto disponible para fixtures | Requiere aceptación declarada; cierre real bloqueado |
| **E4.10** | SPEC28 aprobada; DEV I1–I8 merged; 23 PASS (fixtures)/1 PARCIAL; aceptación global no declarada | v1/v2, reapertura, re-cierre y cancelación disponibles | AC15 real `BLOCKED` por DT6/E3.5; reserva por decidir |
| **E4.11** | SPEC29 aprobada; DEV I1–I6 merged (I4 `f41f6c7`, I5 `024527c`, I6 `4da1516`); 10 PASS/5 PARCIAL con fixtures y 15 `BLOCKED real`; aceptación global no declarada. El tablero aún marca I4–I6 pendientes | Consulta por versión y agregado v27 disponibles para fixtures | Aceptación abierta; reservas AC01/AC02/AC08/AC09/AC15 por decidir |
| **E4.5** | SPEC aprobada; DEV no autorizado; 59 AC `UNRUN`; DT7 abierto | AC06 solo con cobertura declarada sin archivo; AC04 y AC14 limitados | Bloquea archivo/histórico y universo DT7 |
| **E4.7** | Integrada `0e89562` (#210); aceptación pendiente (AC3 `PARCIAL`, AC10–15 `BLOCKED`, AC19 `UNRUN`) | R3/R6 parciales | AC13/AC15 no pueden declararse completos |
| **B3** | Flake sin reproducción Linux; no se usa CI verde como prueba de resolución | Afecta a la confianza de la suite; no se declara PASS ni FAIL por él | Igual |
| **AUD-06 (AC-25/P3)** | Abierto; la equivalencia real de Comida no se certifica | AC12/AC13 limitados a matriz ficticia/sanitizada | Sin contraste privado autorizado no hay equivalencia real |
| **Esquema/candidato** | `test` `7477e86` con `schemaVersion=27`/`C27`; C26/C25 anteriores | SHA congelado de `test`; cualquier cambio reinicia AC16 | Igual; no se mezclan contratos ni se crea tag |
| **SPEC35/tags** | Diseño documental aprobado; D11 abierta; sin tags ni workflows operativos | No se usa tag; SHA de `test` | No se usa tag ni despliegue |

`[CONFIRMADO]` DT6 no bloquea una preparación con fixtures ni el código de E4.9/E4.10/E4.11;
sí bloquea el cierre real, la custodia y el nivel B. Los fixtures **no** acreditan DT6 ni
DT7.

---

## Elegibilidad por nivel

`[PROPUESTA]` Esta tabla resume qué puede intentarse con fixtures (A) y qué exige el ensayo
integral (B). No autoriza F3 ni convierte `UNRUN` en PASS; si falta la fixture integral, el
AC sigue `UNRUN` y F2 no se cierra.

| Grupo | AC | Nivel A: qué podría demostrarse | Nivel B: qué exige además |
| --- | --- | --- | --- |
| Contrato e integridad | AC01, AC11, AC16 | Apertura de copia sintética v27/C27, manifiesto/checksum/FK, corte fijado | Copia externa autorizada, custodia y restauración operativa previa |
| Identidad y vínculos | AC02, AC03, AC04 | IDs, aperturas, relaciones y cardinalidades con fixture integral; alta posterior | Universo E4.5/DT7 y aceptación de dependencias |
| Plan y fotos | AC05, AC07 | Plan vivo/foto congelada; v1/v2 consultables con E4.10/E4.11 actuales | Aceptación E4.9/E4.10/E4.11 y ausencia de reservas abiertas |
| Hechos y auxiliares | AC06 | Cobertura declarada sin archivo E4.5; sin inventar cifras | E4.5/DT7 y auxiliares E3.5/E3.6 con cobertura verificable |
| Acceso y negativos | AC08, AC09 | Login/TOTP, revocación de sesiones/códigos y fallo cerrado en entorno aislado | DT6, claves custodiadas y copia externa real |
| Higiene y evidencia | AC10, AC17 | Revisión de Git/CI/logs y carpeta privada con artefactos sintéticos | Artefactos del ensayo integral y QA final |
| Oráculo y escenarios | AC12, AC13, AC14, AC15 | Matriz sanitizada congelada, diferencias registradas y lista de brechas parcial | DT7, AUD-06, E4.5/E4.7 y aceptación de las dependencias |

`[CONFIRMADO]` AC01/AC11 en nivel A solo acreditan la copia sintética; no demuestran
custodia ni recuperación operativa. AC14/AC15 en nivel A producen un informe parcial de
brechas, no el cierre de P7.

---

## Datos y fixtures

`[PROPUESTA]` Solo datos ficticios, deterministas y sin registros personales, sobre el
contrato v27/C27:

- IDs, aperturas, relaciones y fichas representativas del corte;
- plan vivo y plan final/foto;
- hechos con clasificación, referencias y auxiliares dentro de la cobertura declarada;
- fotos en versiones v1 y v2, con metadatos y fingerprint (E4.10/E4.11 ya tienen fixtures
  parciales reutilizables como referencia, no como evidencia de E4.12);
- una copia ficticia coherente con WAL y un escenario de copia corrupta;
- casos R1–R6/P1–P7 suficientes para contrastar la matriz, sin inventar cifras ausentes.

`[CONFIRMADO]` Prohibido usar datos reales, bases privadas, el libro Excel, credenciales o
secretos. Los fixtures **no** acreditan DT6 ni DT7, y un restore sintético no se presenta
como recuperación operativa. `[PENDIENTE]` La fixture integral con todos los bloques,
fotos v1/v2 y escenarios R/P sigue sin existir; es requisito de F2 para el nivel A.

---

## Criterios de estado y evidencia

`[CONFIRMADO]` El informe usa `PASS`, `PARCIAL`, `UNRUN` y `BLOCKED` con el significado de
la specification §3.5. `[PROPUESTA]` Cuando exista evidencia de nivel A se etiqueta
`PASS (fixtures)` y no se presenta como aceptación. Reglas:

- un caso omitido no es correcto y no se marca PASS;
- un `PASS (fixtures)` no es un PASS de aceptación ni se acumula para cerrar E4.12;
- un expected failure de fixture no es fallo de suite, pero tampoco PASS del AC;
- un CI verde no demuestra equivalencia, custodia externa ni recuperación operativa;
- cada resultado registra acción, entorno, candidato/base, fecha y log crudo;
- la evidencia se guarda en carpeta privada fuera de Git, sin datos personales ni secretos.

---

## Regression checks

`UNRUN`. No hay implementación ni suite propia de E4.12. Este testplan no fija comandos del
ensayo: la fase de preparación debe acordarlos y registrarlos antes de ejecutar. No se
reutiliza evidencia de SPEC31/SPEC32, de restores sintéticos v19/v20/v27 ni de las suites
E4.9/E4.10/E4.11 como si fuera de E4.12: son dependencias, no resultados del ensayo. Si el
ensayo incorporase cambios de código —no previstos—, se aplicaría la entrada única de
verificación documentada en [AGENTS](../AGENTS.md); este documento no la sustituye.

## Functional verification

`UNRUN`. Existen E4.9/E4.10/E4.11 con código integrado y fixtures parciales, pero no hay
copia restaurada, harness ni evidencia E4.12 ejecutada. Los AC01–AC17 dependen de F2/F3 y de
las dependencias de §4; ninguno se declara PASS por la existencia de esas suites.

## Browser verification

`UNRUN`. E4.12 no define UI ni wireframes propios. Si se usa la UI existente para verificar
continuidad o acceso, se registrarán capturas 390/1440 revisadas y estados de carga, vacío
y error, sin factores, bases, claves ni trazas sensibles en artefactos.

## Limitations and next action

- F0 aprobado el 2026-11-09 como gate documental; F1 sigue `IN_PROGRESS` y ningún AC está
  aprobado, ejecutado ni en PASS. Este documento es diseño provisional.
- El ensayo integral (nivel B) **no está autorizado** y no puede ejecutarse sin DT6, DT7,
  las decisiones §9 de la specification y la autorización específica de F3.
- El nivel A (fixtures) tampoco está autorizado: requiere F2, fixture integral, entorno
  aislado y una autorización F3 que declare nivel y AC incluidos.
- E4.9/E4.10/E4.11 tienen código integrado pero aceptación abierta; E4.11 I1–I6 está
  integrado y el tablero debe conciliarse. E4.5 no tiene DEV y E4.7 mantiene reservas.
- El oráculo no está congelado y el libro no ha sido inspeccionado por los agentes.
- Próxima acción independiente: el coordinador debe obtener del usuario la resolución
  explícita de las nueve propuestas de §9 y de las decisiones restantes, y la aceptación de
  E4.7/E4.9/E4.10/E4.11 como corte (o su exclusión con brecha), antes de proponer F2. La
  autorización de F3 sigue siendo un gate separado y debe declarar nivel y AC incluidos.
