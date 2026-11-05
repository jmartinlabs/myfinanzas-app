# 30 — E4.12 Ensayo integral de recuperación y equivalencia: Test plan

Specification: [30-e412-recuperacion-specification.md](30-e412-recuperacion-specification.md)

Status: **DRAFT — no aprobada; no autoriza DEV, ensayo, datos reales, migración, VPS ni
merge. Todos los AC están `UNRUN`.**
Base: `main` `90cd5dc` (2026-11-04); rama `docs/spec-next`.
No hay implementación, migración, ensayo, CI de esta entrega ni datos reales. El ensayo no
está autorizado y este documento no declara PASS.

`[CONFIRMADO]` Este test plan describe **qué evidencia demostraría cada criterio**, no el
procedimiento operativo. Los comandos, rutas, plazos y umbrales concretos deben acordarse y
registrarse en la fase de preparación (F2) antes de ejecutar; no se inventan aquí.

---

## Matriz de aceptación

| Acceptance ID | Precondiciones y acción | Resultado esperado | Método (tipo de evidencia) | Entorno | Owner | Evidencia esperada | Estado | Bloqueo vigente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E4.12-AC01 | Copia ficticia coherente con su WAL y destino nuevo aislado; restaurar y abrir la copia. | La copia abre con el contrato de app/esquema de su versión, sin downgrade ni reset; manifiesto, checksum, integridad, FK y esquema concuerdan. | Comparación pre/post de identidad y metadatos; apertura real; negativo con copia corrupta. | Linux x86_64 aislado (o exclusión declarada); sin PROD | Ejecutor autorizado (por designar) | Manifiesto, SHA-256, DTO de identidad pre/post, resultado de apertura y log crudo | `UNRUN` | DT6; autorización del ensayo |
| E4.12-AC02 | Inventariar IDs del corte antes del restore; restaurar; repetir inventario y dar de alta una entidad nueva. | IDs estables, únicos y no reutilizados; el alta nueva recibe un ID que no ocupa ningún hueco. | Diff de IDs por entidad y recuentos; alta posterior. | Entorno aislado; API/CLI sobre la copia | Ejecutor autorizado | Listado/diff de IDs, recuentos y alta posterior | `UNRUN` | DT6; fixture integral (F2) |
| E4.12-AC03 | Comparar aperturas, Saldos y Deudas antes/después; comprobar que no aparece ningún Movimiento nuevo. | Aperturas conservan su naturaleza de posición/atributo; no se convierten en Movimiento ni se duplican; Saldo/Deuda iguales. | Comparación de DTO y listado de Movimientos. | Entorno aislado | Ejecutor autorizado | DTO de aperturas/Saldos/Deudas pre/post y listado sin altas | `UNRUN` | DT6; fixture integral (F2) |
| E4.12-AC04 | Comparar vínculos y cardinalidades de transferencias, referencias, fichas y auxiliares; consultar huérfanos; navegar por API/UI. | Vínculos 1:1/1:N conservados por ID, sin recreación por nombre ni huérfanos. | Diff de relaciones, consulta de huérfanos y navegación funcional. | Entorno aislado; API/UI | Ejecutor autorizado | Diff de relaciones, cardinalidades y navegación documentada | `UNRUN` | DT6; E4.5 (archivo) |
| E4.12-AC05 | Editar el plan vivo sobre la copia restaurada; consultar plan final/foto antes/después. | El plan vivo sigue editable y el plan final/foto permanece congelado; la edición no altera la foto. | Comparación de DTO antes/después y snapshot de la foto. | Entorno aislado; API/UI | Ejecutor autorizado | DTO del plan pre/post y snapshot de la foto sin cambios | `UNRUN` | E4.9; E4.10 (v2) |
| E4.12-AC06 | Comparar hechos y auxiliares antes/después al corte, dentro de la cobertura declarada (R4/R5). | Importe, fecha, clasificación, referencias y auxiliares conservados; sin pérdida, duplicación ni reclasificación por texto. | Diff de hechos/auxiliares y cobertura por bloque. | Entorno aislado; API | Ejecutor autorizado | Diff de hechos/auxiliares y cobertura por bloque | `UNRUN` | E4.5; E3.5/E3.6 reservas; DT7 |
| E4.12-AC07 | Consultar v1 y v2 tras el restore y comparar contenido/metadatos; contrastar con el cálculo vivo etiquetado. | Fotos conservan versión, corte, metadatos, fingerprint y contenido; v1 y v2 consultables e inmutables; ninguna se confunde con recálculo actual. | Consulta explícita de versiones y diff de contenido/metadatos. | Entorno aislado; API/UI | Ejecutor autorizado | DTO v1/v2, fingerprint, diff y consulta/captura de la versión | `UNRUN` | E4.10 y E4.11 sin DEV; E4.9 en PR |
| E4.12-AC08 | Reutilizar sesiones/desafíos/códigos previos y realizar un login nuevo sobre la copia aislada. | Accesos previos revocados; contraseña + TOTP operativos; el login nuevo emite códigos nuevos. | Prueba de rechazo/aceptación y emisión de códigos. | Entorno aislado; API/UI | Ejecutor autorizado | Respuestas de rechazo/aceptación, emisión de códigos y log sin secretos | `UNRUN` | DT6; autorización del ensayo |
| E4.12-AC09 | Probar copia corrupta, manifiesto/checksum/esquema manipulado, clave errónea, destino existente y antigüedad no aceptada. | Rechazo sin destino parcial ni reemplazo de copia buena; destino previo intacto. | Negativos reproducibles con hash/esquema/clave y comprobación del destino. | Entorno aislado; fixtures | Ejecutor autorizado | Exit no cero, destino previo intacto, ausencia de temporales y log crudo | `UNRUN` | DT6; fixture integral (F2) |
| E4.12-AC10 | Revisar Git, CI, logs y artefactos producidos; verificar la ruta privada de evidencias. | Cero datos reales, bases, claves o secretos publicados; evidencias fuera de Git. | Revisión de contenido/destinos e historial/diff. | Documental; entorno de ensayo | Ejecutor autorizado + QA | Inventario de artefactos, revisión de historial/diff y confirmación de ruta privada | `UNRUN` | Sin autorización; depende de F2/F3 |
| E4.12-AC11 | Verificar manifiesto, checksum y correspondencia snapshot↔WAL de la copia de entrada. | Copia coherente con WAL; integridad/FK/esquema correctos; sin texto plano ni temporales en destino. | Verificación de manifiesto/checksum e integridad. | Entorno aislado | Ejecutor autorizado | Manifiesto, checksum, resultados de integridad/FK/esquema y origen | `UNRUN` | DT6; copia externa no disponible |
| E4.12-AC12 | Revisar la matriz v5.11 y congelarla por hash/fecha antes del ensayo. | Matriz con identificador, procedencia, corte, valor esperado, unidad/precisión y regla; no derivada del motor. | Revisión de matriz y procedencia; registro de congelación. | Documental; revisión del usuario/asesor | Usuario/asesor + ejecutor | Matriz versionada (fuera de Git si aplica), registro de congelación y revisión | `UNRUN` | DT7; oráculo no inspeccionado; AUD-06 |
| E4.12-AC13 | Contrastar cada escenario R1–R6/P1–P7 con la matriz congelada al mismo corte y clasificar diferencias. | Resultado observado frente a esperado por caso; diferencias registradas; ningún omitido se lee como correcto. | Comparación por escenario y clasificación de diferencias. | Entorno aislado; API/UI + matriz | Ejecutor autorizado | Tabla de resultados por caso, diferencias y cobertura de escenarios | `UNRUN` | AC12; dependencias E4.5–E4.11 |
| E4.12-AC14 | Consolidar AC01–AC13 y el estado real de dependencias en un informe de brechas. | Listado con estado por elemento (`PASS`/`PARCIAL`/`UNRUN`/`BLOCKED`), causa, responsable y gate. | Consolidación y revisión QA del informe. | Documental | Coordinador + QA independiente | Informe de brechas trazable a caso/AC y decisión de gate P7 | `UNRUN` | F3 no ejecutada |
| E4.12-AC15 | Construir la matriz de cobertura escenario→AC→evidencia. | Los cinco escenarios del roadmap están cubiertos o declarados fuera con brecha explícita. | Matriz de cobertura y revisión de exclusiones. | Documental | Coordinador + QA | Matriz de cobertura completa con exclusiones motivadas | `UNRUN` | Dependencias no cerradas |
| E4.12-AC16 | Revisar candidato, versión de app/esquema, contrato y fixtures del corte; listar inclusiones/exclusiones. | Restore y oráculo usan el mismo corte; E4.5/E4.9/E4.10/E4.11 figuran integrados, parciales o excluidos explícitamente. | Revisión documental del candidato y del corte. | Documental | Coordinador | SHA del candidato, versión de esquema, contrato y lista de inclusiones/exclusiones | `UNRUN` | E4.9 en PR; E4.10/E4.11 sin DEV |
| E4.12-AC17 | Revisar el registro de evidencia y reproducir una muestra. | Cada resultado registra acción, entorno, candidato, base, fecha y log crudo; estados honestos; restore sintético no se presenta como operativo. | Revisión QA y reproducción de muestra. | Documental; entorno de ensayo | QA independiente | Registro de evidencia, logs crudos, revisión QA y declaración de límites | `UNRUN` | F3 no ejecutada |

`[CONFIRMADO]` Ningún AC se declara PASS en este documento. Un `PARCIAL`, `UNRUN` u omitido
no se convierte en PASS (quality, T-QA).

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
| F0 · SPEC | Este testplan y la specification | `UNRUN` (documental) | Aprobación del usuario |
| F1 · Decisiones | Registro de destino, custodia, entorno, corte, matriz, evidencias y alcance | `UNRUN` | Separada de F0 |
| F2 · Preparación de evidencias | Fixtures integrales, copia ficticia coherente, matriz congelada, criterios por escenario, entorno aislado | `UNRUN` | Separada de F0/F1 |
| F3 · Ensayo autorizado | Evidencia cruda por AC y escenario | `UNRUN` | Explícita e identificable |
| F4 · Informe | Informe E4.12 y lista de brechas para P7 | `UNRUN` | Separada de F3 |

`[CONFIRMADO]` Aprobar la SPEC o este testplan no autoriza F1–F4, DEV, datos reales,
migración, VPS ni merge.

---

## Dependencias que bloquean la ejecución

- **DT6/T-BKP:** abierto; sin destino externo, segunda copia, custodia de claves ni
  restauración operativa previa. AC01, AC03–AC09, AC11 y AC17 no son ejecutables como
  ensayo integral. `UNRUN — bloqueado`.
- **DT7:** mapping y corte sin aprobar. AC12 y AC14 no tienen correspondencia campo→caso.
  `UNRUN — bloqueado`.
- **E4.9:** integrada `0176ffc` (#200); QA APTO CON RESERVAS; cierre real bloqueado por
  DT6. AC05, AC07 y AC13 siguen condicionados. `UNRUN — bloqueado`.
- **E4.10/E4.11:** SPEC28 ratificada documentalmente (24 AC `UNRUN`) y SPEC29 en borrador,
  sin DEV. No hay v1/v2 reales ni consulta histórica por corte/versión. AC07 y AC13 quedan
  bloqueados. `UNRUN — bloqueado`.
- **E4.5:** SPEC aprobada, DEV no autorizado, DT7 pendiente y 59 AC `UNRUN`. AC06, AC12 y
  la parte de archivo de AC14 quedan bloqueados. `UNRUN — bloqueado`.
- **E4.7:** SPEC25 candidata, sin DEV; R3/R6 incompletos. AC13/AC15 no pueden declararse
  completos. `UNRUN — bloqueado`.
- **B3:** flake sin reproducción Linux; no se usa CI verde como prueba de resolución.
  Afecta a la confianza de la suite, no se declara PASS ni FAIL por él.
- **AUD-06 (AC-25/P3):** abierto; la equivalencia real de Comida no se certifica. AC12/AC13
  quedan limitados a la matriz ficticia/sanitizada.

---

## Datos y fixtures

`[PROPUESTA]` Solo datos ficticios, deterministas y sin registros personales:

- IDs, aperturas, relaciones y fichas representativas del corte;
- plan vivo y plan final/foto;
- hechos con clasificación, referencias y auxiliares dentro de la cobertura declarada;
- fotos en versiones v1 y v2, con metadatos y fingerprint;
- una copia ficticia coherente con WAL y un escenario de copia corrupta;
- casos R1–R6/P1–P7 suficientes para contrastar la matriz, sin inventar cifras ausentes.

`[CONFIRMADO]` Prohibido usar datos reales, bases privadas, el libro Excel, credenciales o
secretos. Los fixtures **no** acreditan DT6 ni DT7, y un restore sintético no se presenta
como recuperación operativa.

---

## Criterios de estado y evidencia

`[CONFIRMADO]` El informe usa `PASS`, `PARCIAL`, `UNRUN` y `BLOCKED` con el significado de
la specification §3.5. Reglas:

- un caso omitido no es correcto y no se marca PASS;
- un expected failure de fixture no es fallo de suite, pero tampoco PASS del AC;
- un CI verde no demuestra equivalencia, custodia externa ni recuperación operativa;
- cada resultado registra acción, entorno, candidato/base, fecha y log crudo;
- la evidencia se guarda en carpeta privada fuera de Git, sin datos personales ni secretos.

---

## Regression checks

`UNRUN`. No hay implementación ni suite de E4.12. Este testplan no fija comandos del
ensayo: la fase de preparación debe acordarlos y registrarlos antes de ejecutar. No se
reutiliza evidencia de SPEC31/SPEC32 ni de restores sintéticos v19/v20 como si fuera de
E4.12. Si el ensayo incorporase cambios de código —no previstos—, se aplicaría la entrada
única de verificación documentada en [AGENTS](../AGENTS.md); este documento no la
sustituye.

## Functional verification

`UNRUN`. No hay endpoints, CLI ni copia restaurada sobre la que verificar continuidad. Los
AC01–AC09 y AC11–AC13 dependen de F2/F3 y de las dependencias de §4.

## Browser verification

`UNRUN`. E4.12 no define UI ni wireframes propios. Si se usa la UI existente para verificar
continuidad o acceso, se registrarán capturas 390/1440 revisadas y estados de carga, vacío
y error, sin factores, bases, claves ni trazas sensibles en artefactos.

## Limitations and next action

- Ningún AC aprobado, ejecutado ni en PASS; este documento es diseño provisional.
- El ensayo integral **no está autorizado** y no puede ejecutarse sin DT6, DT7, las
  decisiones §9 de la specification y la autorización específica de F3.
- E4.5/E4.7/E4.10/E4.11 sin DEV y E4.9 en PR impiden construir hoy un corte estable y una
  fixture integral con fotos v1/v2.
- El oráculo no está congelado y el libro no ha sido inspeccionado por los agentes.
- Próxima acción independiente: el coordinador debe obtener del usuario la aprobación de la
  SPEC/testplan o, como mínimo, resolver las decisiones de §9 y confirmar el estado de
  E4.9/E4.10/E4.11 antes de proponer F2.
