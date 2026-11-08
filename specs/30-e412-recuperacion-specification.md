# 30 — E4.12 Ensayo integral de recuperación y equivalencia: Specification

Status: **DRAFT — no aprobada; no autoriza DEV, ensayo, datos reales, migración, VPS ni merge.**
Approval source/date: **PENDING** — no existe aprobación funcional ni revisión de Álex
registrada para E4.12.
Base: `test` `7477e86` (2026-11-08); rama `docs/spec30-revision`. Sin cambios de aplicación,
esquema, infraestructura, datos ni tablero.
Ningún AC está ejecutado: este documento **no declara PASS** y **no cierra E4.12**.

Contexto y fuentes: [requisitos E4.12](investigations/e412-recovery-requirements-2026-11-04.md),
[roadmap E4.12](roadmap.md#e412--ensayo-integral-de-recuperación-y-preparación-de-equivalencia)
y sus reglas T-BKP, DT6, DT7 y P7,
[SPEC31](31-sqlite-produccion-specification.md) /
[testplan 31](31-sqlite-produccion-testplan.md),
[SPEC32](32-ejecucion-rootless-specification.md) /
[testplan 32](32-ejecucion-rootless-testplan.md),
[SPEC27/E4.9](27-e49-cierre-financiero-specification.md),
[SPEC28/E4.10](28-e410-reapertura-specification.md),
[SPEC29/E4.11](29-e411-fotografias-specification.md),
[SPEC20/E4.5](20-historico-precontrol-specification.md),
[aceptación E4.10](investigations/e410-acceptance-2026-11-06.md),
[aceptación E4.11](investigations/e411-acceptance-2026-11-07.md),
[DT6/T-BKP](investigations/dt6-t-bkp-procedure-2026-10-31.md),
[DT7](investigations/dt7-decision-closure-2026-11-05.md),
[security](guidelines/security.md), [quality](guidelines/quality.md),
[referencia funcional v5.11](functional-reference-v5.11.md) y [tablero](epic-board.md).

El número `30` es soporte documental propuesto en el
[índice de identificadores](methodology/identifier-index.md); la identidad de la entrega es
**E4.12 · SPEC**.

**Leyenda:** `[CONFIRMADO]` = regla de un documento aprobado, decisión registrada o hecho
verificado de solo lectura; `[PROPUESTA]` = detalle candidato de esta SPEC; `[PENDIENTE]` =
decisión o evidencia que aún no existe. Ninguna marca convierte una propuesta en
autorización.

**Nota de vigencia documental:** el inventario de requisitos se contrastó sobre `main`
`0b8aade`; este borrador se apoya en el estado de `test` `7477e86` y en los informes de
aceptación de E4.10 (2026-11-06/07) y E4.11 (2026-11-07). Las diferencias materiales se
registran en §3.2, §4.1 y §7 y no reabren decisiones aprobadas. El tablero sigue siendo la
referencia de seguimiento, pero no es autorización y puede ir por detrás de la evidencia
registrada.

---

## 1. Capacidad

`[CONFIRMADO]` E4.12 es el **ensayo integral final** de recuperación y preparación de
equivalencia, no el inicio de la estrategia de recuperación (roadmap, T-BKP). Debe
demostrar tres resultados distintos que no se sustituyen entre sí:

1. **E4.12-AC1 — continuidad:** restaurar una copia ficticia coherente en un destino
   aislado conserva IDs, aperturas, relaciones, plan, hechos y versiones de fotos.
2. **E4.12-AC2 — oráculo independiente:** la matriz de casos de v5.11 aporta valores
   esperados ajenos al motor probado.
3. **E4.12-AC3 — brechas explícitas:** existe un listado de discrepancias y huecos que
   deja claro qué falta para P7.

`[CONFIRMADO]` Una fotografía financiera no sustituye una copia restaurable y un restore
sintético verde no acredita custodia externa, recuperabilidad operativa ni equivalencia
económica (T-BKP; restore v19/v20; DT6).

Esta SPEC define **qué propiedad debe sostenerse, qué evidencia la demostraría y qué
límites tiene el ensayo**. No diseña el procedimiento operativo definitivo, no fija plazos,
RPO/RTO nuevos ni umbrales de aceptación, y no ejecuta ninguna fase.

---

## 2. Alcance

### 2.1 Dentro del alcance

`[PROPUESTA]` La SPEC cubre, como contrato documental, únicamente:

- la restauración de **una copia ficticia coherente con su estado WAL** en un **entorno
  aislado**, sin acceso a la base en servicio;
- la comprobación comparativa **antes/después** de continuidad de identidad y vínculos:
  IDs, aperturas, relaciones y fichas, plan vivo y plan final, hechos con su clasificación
  y auxiliares, y **versiones de fotos**;
- la verificación de acceso tras la restauración según el diseño vigente (contraseña +
  TOTP; revocación de sesiones, desafíos, códigos e intentos previos);
- el contraste de los escenarios R1–R6/P1–P7 contra una **matriz v5.11 congelada** que
  actúe como oráculo independiente;
- la producción de un **listado de discrepancias y brechas** para el gate P7, con estado
  por elemento, causa, responsable y gate que lo cierra;
- la definición de las **evidencias de entrada, fases y autorizaciones separadas** que
  harían ejecutable el ensayo en el futuro.

### 2.2 Fuera del alcance

`[CONFIRMADO]` Quedan fuera de esta entrega, y se detallan en §8:

- ejecutar el ensayo, restaurar copias reales o ficticias, migrar, desplegar o contratar
  servicios;
- usar datos reales, bases privadas, el libro Excel o credenciales;
- certificar equivalencia real sin contraste privado autorizado (AC-25/P3 sigue abierto);
- cambiar el maestro, activar el régimen productivo o cerrar P7;
- definir procedimientos operativos definitivos, automatización, retención, custodia o
  destino externo (pertenecen a DT6 y a decisiones del usuario);
- aprobar UI, wireframes o la política de composición de fotos de periodo (DT8/E4.10/E4.11).

### 2.3 Qué significa «preservar»

`[CONFIRMADO]` «Preservar» exige **igualdad verificable de identidad y vínculos**, no solo
conteos. Un recuento igual con IDs recreados, aperturas convertidas en Movimientos o fotos
recalculadas no demuestra continuidad.

| Dimensión | Qué debe conservarse | Qué invalidaría la evidencia |
| --- | --- | --- |
| ID e identidad | IDs estables, únicos y no reutilizados de Saldos, Deudas, Partidas, Referencias, Movimientos, ciclos, fotos y archivo E4.5. | IDs nuevos que ocupan huecos, reset de contadores o reasignación por nombre. |
| Aperturas | Posición/atributo de apertura, distinta de un Movimiento. | Apertura materializada como Movimiento, duplicada o recalculada. |
| Relaciones y fichas | Vínculos 1:1 y 1:N por ID, con cardinalidad conservada y sin huérfanos. | Relaciones recreadas por nombre, duplicadas o perdidas. |
| Plan | Plan vivo editable y plan final/foto congelado, distinguibles. | Editar el vivo altera la foto, o el plan final se recalcula. |
| Hechos | Importe, fecha, clasificación, referencias y auxiliares con su cobertura declarada. | Reclasificación por texto, pérdida, duplicación o cobertura inventada. |
| Fotos | Versión, corte, metadatos, fingerprint y contenido persistido; v1 y v2 consultables e inmutables. | v1 sustituida por v2, recálculo desde el estado vivo o pérdida de metadatos. |
| Acceso | Contraseña + TOTP operativos; accesos previos revocados. | Sesiones/códigos/desafíos previos que resucitan o login sin MFA. |

`[CONFIRMADO]` La copia restaurada abre con el contrato de esquema que corresponde a su
versión, sin downgrade destructivo y sin reset de identidad (security; SPEC31). Las
sesiones, desafíos, códigos e intentos previos **no resucitan**; un login nuevo emite
códigos nuevos (security; SPEC31 AC-26).

### 2.4 Límite de alcance

`[CONFIRMADO]` El ensayo se ejecuta sobre **datos ficticios** y un **entorno aislado**. No
se ejecuta contra PROD, la base en servicio, el VPS ni el libro real. Un resultado del
ensayo no acredita por sí solo custodia externa, hardware real, plataforma Linux/x86_64
ni equivalencia económica real.

### 2.5 Dos niveles de evidencia, un solo estándar de declaración

`[PROPUESTA]` Para no mezclar «lo que ya puede probarse» con «lo que exige operación real»,
E4.12 distingue dos niveles. El nivel A puede ejecutarse con fixtures en un entorno aislado;
el nivel B es el ensayo integral final y exige los gates de §4 y §5. Ninguno de los dos
convierte una propuesta en autorización.

| Dimensión | Nivel A — fixtures | Nivel B — integral final |
| --- | --- | --- |
| Datos | Fixtures deterministas y ficticias; copia sintética coherente con WAL | Copia ficticia coherente autorizada y, si se busca equivalencia real, contraste privado autorizado |
| Entorno | Aislado, sin PROD; Linux x86_64 si se declara esa evidencia | Entorno de ensayo autorizado con configuración productiva declarada |
| Puede demostrar | Contrato de esquema, integridad/FK, identidad y vínculos, fotos v1/v2, fallo cerrado, acceso y revocación con fixtures | Lo anterior más custodia externa, recuperación operativa, plataforma y oráculo |
| No puede demostrar | DT6, custodia, RPO/RTO, recuperación operativa ni equivalencia económica | Nada que dependa de datos reales no autorizados (AC-25/P3) |
| Etiqueta de resultado | `PASS (fixtures)`/`PARCIAL`/`UNRUN`/`BLOCKED`; nunca aceptación global | `PASS`/`PARCIAL`/`UNRUN`/`BLOCKED` con alcance declarado |

`[CONFIRMADO]` Un `PASS (fixtures)` no es un PASS de aceptación y no se convierte en PASS
integral por acumulación. El nivel A sirve para preparar evidencia y detectar huecos, no
para cerrar E4.12 ni P7. `[PROPUESTA]` La autorización de F3 debe declarar qué nivel se
autoriza; sin esa declaración no se ejecuta ninguno.

---

## 3. Requisitos y criterios de aceptación

### 3.1 Reglas de aceptación

`[CONFIRMADO]` Cada criterio se declara antes de ejecutar con tres piezas separadas:
**requisito** (qué propiedad debe sostenerse), **cómo se probará** (tipo de evidencia, no
el procedimiento) y **evidencia esperada**. `[CONFIRMADO]` Un `PARCIAL`, `UNRUN` u omitido
**no se convierte en PASS**; un caso omitido no puede leerse como correcto (quality, T-QA).
Este documento no declara PASS de ningún AC.

### 3.2 Criterios

| ID | Requisito | Cómo se probará (tipo de evidencia) | Evidencia esperada | Estado |
| --- | --- | --- | --- | --- |
| **E4.12-AC01** | La copia restaurada en destino nuevo abre con el contrato de app/esquema que corresponde a su versión, sin downgrade destructivo ni reset de identidad; manifiesto, checksum, integridad, FK y esquema concuerdan. | Comparación pre/post de identidad y metadatos; apertura real de la copia restaurada; negativo con copia corrupta o manipulada. | Manifiesto, SHA-256, DTO de identidad pre/post, resultado de apertura y log crudo. | `UNRUN` |
| **E4.12-AC02** | IDs de entidades, ciclos, fotos y archivo E4.5 se conservan estables, únicos y no reutilizados; ningún ID nuevo ocupa el hueco de uno existente. | Inventario y diff de IDs antes/después del restore; alta posterior sobre la copia para comprobar que no reutiliza IDs. | Listado/diff de IDs por entidad, recuentos y alta posterior con ID nuevo. | `UNRUN` |
| **E4.12-AC03** | Las aperturas conservan su naturaleza de posición/atributo, no se convierten en Movimiento, no se duplican y Saldo/Deuda antes y después son iguales. | Comparación de aperturas y consulta de Saldos/Deudas; comprobación de que no se crea ningún Movimiento. | DTO de aperturas/Saldos/Deudas pre/post y listado de Movimientos sin altas. | `UNRUN` |
| **E4.12-AC04** | Relaciones, transferencias, referencias, fichas y auxiliares conservan vínculos y cardinalidad 1:1/1:N; ninguna relación se recrea por nombre ni queda huérfana. | Diff de vínculos por ID, consulta de huérfanos y navegación funcional por API/UI sobre la copia. | Diff de relaciones, cardinalidades por ficha y navegación documentada. | `UNRUN` |
| **E4.12-AC05** | El plan vivo sigue siendo editable según su contrato y el plan final/foto permanece congelado; editar el vivo no altera la foto ni el plan final. | Edición del plan vivo sobre la copia restaurada y consulta del plan final/foto antes/después. | DTO del plan antes/después y snapshot de la foto sin cambios. | `UNRUN` |
| **E4.12-AC06** | Los hechos conservan importe, fecha, clasificación, referencias y auxiliares con su cobertura declarada; no se pierden, duplican ni reclasifican por texto. | Comparación de hechos y auxiliares antes/después al corte, dentro de la cobertura declarada (R4/R5). | Diff de hechos/auxiliares y cobertura por bloque. | `UNRUN` |
| **E4.12-AC07** | Las fotos conservan versión, corte, metadatos, fingerprint y contenido persistido; v1 y v2 son consultables e inmutables y una foto anterior no se confunde con un recálculo actual. | Consulta explícita de v1 y v2 tras el restore y comparación de contenido/metadatos; contraste etiquetado con el cálculo vivo. | DTO v1/v2, fingerprint, diff de contenido y consulta/captura de la versión seleccionada. | `UNRUN` |
| **E4.12-AC08** | Tras el restore, contraseña + TOTP son operativos; sesiones, desafíos, códigos e intentos previos no resucitan y un login nuevo emite códigos nuevos. | Reutilización de credenciales/sesiones previas y login nuevo real sobre la copia aislada. | Respuestas de rechazo/aceptación, emisión de códigos nuevos y ausencia de secretos en logs. | `UNRUN` |
| **E4.12-AC09** | Ante copia corrupta, manifiesto/checksum/esquema manipulado, clave errónea, destino existente o antigüedad no aceptada, la restauración falla cerrada, sin destino parcial ni reemplazo de copia buena. | Negativos reproducibles con hash/esquema/clave y comprobación del estado previo del destino. | Exit no cero, destino previo intacto, ausencia de temporales utilizables y log crudo. | `UNRUN` |
| **E4.12-AC10** | Cero datos reales, bases, claves o secretos en Git, CI, logs o artefactos; la evidencia del ensayo reside en una carpeta privada fuera de Git. | Revisión de contenido, destinos, logs y artefactos producidos; revisión de historial/diff. | Inventario de artefactos, resultado de revisión y confirmación de ruta privada sin valores secretos. | `UNRUN` |
| **E4.12-AC11** | La copia de entrada es un snapshot coherente con WAL, con manifiesto (app, esquema, origen, instante, id), SHA-256, integridad/FK/esquema y sin texto plano ni temporales en el destino. | Verificación del manifiesto/checksum y de la correspondencia snapshot↔estado; no se copia un archivo abierto a ciegas. | Manifiesto, checksum, resultados de integridad/FK/esquema y declaración de origen. | `UNRUN` |
| **E4.12-AC12** | La matriz v5.11 está congelada antes de ejecutar, con identificador, procedencia, corte, valor esperado, unidad/precisión y regla; no se calcula con el motor validado ni se copia de su salida. | Revisión de la matriz y de su procedencia; congelación por hash/fecha antes del ensayo. | Matriz versionada (fuera de Git si contiene datos), registro de congelación y revisión del usuario/asesor. | `UNRUN` |
| **E4.12-AC13** | Cada escenario R1–R6/P1–P7 se contrasta al mismo corte; las diferencias se registran y no se fuerzan a PASS; un caso omitido no se lee como correcto. | Ejecución por escenario con resultado observado frente al esperado y clasificación de diferencias. | Tabla de resultados por caso, diferencias explicadas/no explicadas y cobertura de escenarios. | `UNRUN` |
| **E4.12-AC14** | Existe un listado de discrepancias y brechas con estado por elemento (`PASS`/`PARCIAL`/`UNRUN`/`BLOCKED`), causa, responsable y gate que lo cierra, que permite decidir el gate P7 sin inferencias. | Consolidación del informe a partir de AC01–AC13 y del estado real de las dependencias. | Informe de brechas trazable a caso/AC y decisión de gate P7. | `UNRUN` |
| **E4.12-AC15** | Los escenarios obligatorios del roadmap —recuperación en limpio, copia corrupta, recuperación de acceso, no publicación de datos/claves y escenarios integrados R1–R6/P1–P7— están cubiertos o declarados fuera con brecha explícita. | Matriz de cobertura escenario→AC→evidencia, sin huecos silenciosos. | Matriz de cobertura completa con exclusiones motivadas. | `UNRUN` |
| **E4.12-AC16** | Versión de app/esquema, contrato y fixtures se fijan antes de ejecutar; restore y oráculo usan el mismo corte; E4.5/E4.7/E4.9/E4.10/E4.11 figuran integrados, parciales o excluidos explícitamente. | Revisión del candidato y del corte; lista de inclusiones/exclusiones con justificación. | SHA del candidato, versión de esquema, contrato y lista de inclusiones/exclusiones. | `UNRUN` |
| **E4.12-AC17** | Cada resultado registra acción, entorno, candidato, base, fecha y log crudo; `PARCIAL`/`UNRUN`/`BLOCKED` no se convierten en PASS; un restore sintético no se presenta como recuperación operativa. | Revisión de evidencia por QA independiente y reproducción de una muestra. | Registro de evidencia, logs crudos, revisión QA y declaración de límites. | `UNRUN` |

`[PROPUESTA]` Los identificadores `E4.12-AC01…AC17` descomponen los tres AC del roadmap en
criterios verificables; no crean aceptación nueva ni alteran E4.12-AC1…AC3.

`[CONFIRMADO]` Los 17 AC están `UNRUN`: no se ha ejecutado ningún caso y `UNRUN` no
significa correcto. `[PROPUESTA]` A nivel A (fixtures, §2.5) son elegibles AC01–AC11 y
AC14–AC17 con el alcance que fije F2; AC12 solo con una matriz sanitizada congelada y AC13
solo para los escenarios R/P que no dependan de E4.5/DT7 ni de datos reales. AC01 y AC11
acreditan entonces contrato e integridad de una copia **sintética**, no custodia externa ni
recuperación operativa. AC06 se limita a la cobertura declarada sin archivo E4.5; AC12 y
AC13 no pueden declarar equivalencia económica. El nivel B (integral final) exige además
los gates de §4 y §5 y la autorización específica de F3.

### 3.3 Cobertura de los escenarios obligatorios

`[CONFIRMADO]` El roadmap enumera estos escenarios como requisitos de prueba, no como
procedimiento (roadmap, E4.12-Pruebas).

| Escenario | Requisito | AC que lo cubren | Evidencia esperada |
| --- | --- | --- | --- |
| Recuperación en limpio | Copia coherente restaurada en destino nuevo y funcional | AC01, AC02–AC07, AC08, AC16 | Identidad + vínculos + fotos + acceso comparados antes/después |
| Copia corrupta | Falla cerrada, sin destino parcial ni reemplazo | AC09, AC01 | Negativo reproducible con hash/esquema y destino previo intacto |
| Recuperación de acceso | Contraseña + TOTP operativos; accesos previos revocados | AC08 | Login real sobre copia aislada y revocación comprobada |
| No publicación de datos/claves | Cero datos reales o secretos en Git, CI, logs o artefactos | AC10 | Revisión de contenido y destinos |
| R1–R6/P1–P7 con corte común | Escenarios integrados al mismo corte con oráculo congelado | AC12–AC15 | Matriz de equivalencia y evidencias por escenario |

`[CONFIRMADO]` La recuperación en limpio demuestra continuidad; la copia corrupta
demuestra el fallo cerrado; ninguna de las dos demuestra por separado custodia externa ni
equivalencia económica.

### 3.4 Independencia del oráculo

`[CONFIRMADO]` «Independiente» excluye calcular el esperado con el mismo código que se
valida, copiar la salida de la aplicación o deducir el valor desde fixtures generadas por
el motor (roadmap E4.12-AC2).

`[PENDIENTE]` El libro `MyFinanzas2026_v5.11(7).xlsx` es la referencia única y **no ha sido
inspeccionado físicamente por los agentes**; la matriz disponible es la referencia
sanitizada, no el libro (functional-reference, «Procedencia y autoridad»). No se inventan
cifras, casos ni reglas para completarla. `[CONFIRMADO]` AC-25/P3 de Comida sigue abierto
(AUD-06): sin contraste privado autorizado no se declara equivalencia real de Comida y AC2
queda limitado a la matriz ficticia/sanitizada.

### 3.5 Estados y honestidad de la evidencia

`[CONFIRMADO]` El informe usa estados explícitos por elemento:

- `PASS`: requisito demostrado con evidencia identificable y reproducible.
- `PARCIAL`: parte del requisito demostrada; la parte restante queda declarada.
- `UNRUN`: no ejecutado; nunca equivale a correcto.
- `BLOCKED`: no ejecutable por una dependencia o decisión ausente, con causa y gate.

`[CONFIRMADO]` No se declara PASS por un CI verde, por un restore sintético previo ni por la
aprobación de esta SPEC. El flake SQLite B3 no se considera resuelto por ausencia de
reproducción en macOS (sqlite-b3-short-read).

---

## 4. Dependencias

`[CONFIRMADO]` Las dependencias se leen en su estado real; el tablero **no es autorización**.
Los estados de E1–E3 y E4.1/E4.2 proceden del inventario de requisitos, del tablero y de los
informes de aceptación citados; **no se reauditan en esta rama**. El estado vigente se fija
a `test` `7477e86` (2026-11-08), no a la base histórica del borrador.

### 4.1 Estado real por entrega

> **Nota (2026-11-08):** esta tabla sustituye la foto histórica a `90cd5dc`. E4.9, E4.10 y
> E4.11 ya tienen código integrado; E4.7 también. Sus aceptaciones siguen abiertas. Donde
> el tablero y el informe/testplan discrepan, se indica y no se resuelve por inferencia.

| Dependencia | Estado real vigente (2026-11-08) | Situación | Exigencia para el ensayo |
| --- | --- | --- | --- |
| **E1.1–E1.6** | Integradas; E1.1 con 6 AC `PARCIAL`; E1.6 con contratos futuros separados | Integrado con reservas | Contratos estables de IDs, aperturas, movimientos, referencias y deuda; sin deuda documental que altere identidad |
| **E2.1–E2.6** | Integradas; E2.6 cerrada/integrada | Integrado | Plan de ciclo/anual, presupuestos, nómina y flujo con oráculo congelado |
| **E3.1–E3.6** | Integradas con reservas: E3.1 AC36 `PARCIAL`; E3.2 D5-AC13 parcial/B-T11 `UNRUN`; E3.3 retorno administrativo por consolidar; E3.4 AC-25 abierto; E3.5 `MERGED 1560d04` con AC-15 `PARCIAL`; E3.6 `MERGED a26fffb` | Integrado con reservas | Auxiliares y Comida/FIN_NETA con cobertura declarada; AC-25/P3 resuelto o excluido explícitamente |
| **E4.1** | Integrada `156a50d`; 6 AC `PARCIAL` | Integrado con reservas | Posiciones/instrumentos con cobertura y sin contratos abiertos que cambien el corte |
| **E4.2** | Integrada `fd2e21c` | Integrado | Ventas/posición estables para el corte |
| **E4.3** | A+B+C y QA integrados (`3b9be46`, `8552d4a`, `dd56553`); 15 AC PASS de cobertura y 2 `PARCIAL` | Integrado con reservas | Valoración/resultados con estado explícito; `No disponible` admisible en la primera foto, no en el ensayo final |
| **E4.4** | Integrada `024b348`; evidencia post-merge #190 | Integrado; aceptación no registrada | Deuda completa y conciliación con corte; deuda de trazabilidad documental declarada |
| **E4.5** | SPEC20 aprobada (docs `a806fd9`, #216); **DEV no autorizado**; 59 AC `UNRUN`; DT7 abierto | **Sin DEV** | Archivo/histórico precontrol operativo y mapping DT7; sin esto no hay universo histórico completo |
| **E4.6** | Integrada `cfbedb0` (#201); AC-01 `PARCIAL` | Integrado con reservas | Resumen de inicio en el corte o exclusión declarada |
| **E4.7** | Integrada `0e89562` (#210) con docs `948ade8`; aceptación pendiente (AC3 `PARCIAL`, AC10–15 `BLOCKED`, AC19 `UNRUN`) | Integrado con reservas | Resumen anual y flujo trazable; sin esto no se cierra R3/R6 |
| **E4.8** | Precierre integrado (#150/#161); sin cierre real | Integrado | Controles de consistencia operativos antes del cierre/foto |
| **E4.9** | **Merged `0176ffc`** (#200); QA APTO CON RESERVAS; aceptación pendiente; AC-09 y cierre real sujetos a DT6 | **Integrado; aceptación abierta** | Cierre manual, foto inmutable y preflight de backup verificables; DT6 bloquea el cierre real, no el código |
| **E4.10** | SPEC28 aprobada; DEV I1–I8 merged (I1 `70fa7c0`…I7 `81c8960`, I8 `5ea79b9`); **23 PASS (fixtures) / 1 PARCIAL**; aceptación global no declarada | **Integrado; aceptación abierta** | Reapertura, re-cierre, v1/v2 y cancelación disponibles; AC15 real sigue `BLOCKED` por DT6/E3.5 |
| **E4.11** | SPEC29 aprobada (`6fe91d7`); DEV I1–I6 merged (I1 `a658803`, I2 `ef7bb00`, I3 `a3c616d`, I4 `f41f6c7`, I5 `024527c`, I6 `4da1516`); aceptación con fixtures **10 PASS / 5 PARCIAL / 15 `BLOCKED real`**; aceptación global no declarada | **Integrado; aceptación abierta** | Consulta por ciclo/versión y agregado v27 disponibles para fixtures. El tablero conserva «I4–I6 pendientes» y está desactualizado frente al historial; no se edita aquí |
| **E4.12** | SPEC30 = este documento | **Borrador** | Aprobación propia y autorización separada del ensayo |

`[CONFIRMADO]` E4.10 y E4.11 **no están funcionalmente aceptadas**: sus PASS son de
fixtures y sus reservas/`BLOCKED real` siguen abiertos. `[PROPUESTA]` E4.12 puede usar su
código y sus fixtures para el nivel A, pero no puede presentar esa evidencia como
aceptación de E4.10/E4.11 ni como cierre de sus AC.

### 4.2 Contrato de esquema y candidato

`[CONFIRMADO]` En `test` `7477e86` el contrato vigente es `schemaVersion=27` /
`C27-E411-FOTOS-PERIODO`; `C26-E410-REAPERTURA-V26` (v26) queda como versión anterior
registrada. El manifiesto `schema-contracts.json` contiene C25 (E4.9), C26 (E4.10) y C27
(E4.11). [SPEC35](35-deploy-tags-01-specification.md) declara el mismo contrato y el flujo
`feature/* → test → main`; `test` es el origen de TEST y `main` el de PROD futuro. No se
asume downgrade ni compatibilidad no verificada entre contratos.

`[PROPUESTA]` E4.12 **no reserva versión de esquema**: es un ensayo, no una feature. Debe
fijar como candidato un SHA congelado alcanzable desde `test`, con `schemaVersion=27` y
`C27` verificados, y declararlo en AC16. Cualquier cambio posterior de esquema o contrato
invalida el corte y exige re-fijarlo; no se mezclan contratos ni se hace downgrade. El
ensayo no crea tags: la convención `deploy-test-v*`/`deploy-prod-v*` de SPEC35 sigue sin
implementar (D11 abierta y fases 1–6 de SPEC35 no autorizadas) y su activación no forma parte de E4.12. `[PROPUESTA]` Tampoco
hay paquete DEV de producto: si F2 necesita scripts o un harness de ensayo, son test-only,
no tocan producción ni esquema y requieren la autorización de F2.

### 4.3 DT6/T-BKP

`[CONFIRMADO]` DT6 exige copia SQLite coherente (WAL), automatización/frecuencia, RPO/RTO,
retención, cifrado, custodia/recuperación de claves, ubicación externa y prueba de
restauración (roadmap DT6). **Estado real: abierto.** El usuario no dispone de destino
externo; no hay copia externa ni restauración operativa probada. Solo existen restores
sintéticos y preflight técnico.

`[CONFIRMADO]` La ruta de código existe (VACUUM INTO, `age`, manifiesto/checksum,
publicación por rename, revocación de accesos) y hay ensayos v19/v20. La aceptación E4.10
registra además un restore v27 en Linux (AC22, CI #257) y el gate rootless 26→27 está
integrado (`1fa0ecc`), pero el restore sintético **no cierra DT6** ni acredita custodia
externa. El nivel A puede reutilizar el mecanismo con fixtures; el nivel B no.

`[PENDIENTE]` Antes del ensayo integral faltan: destino externo autorizado, segunda copia,
custodia/rotación de la identidad, ventana/frecuencia reales, evidencia de llegada y una
restauración previa en entorno aislado que no sea el propio ensayo integral.

`[CONFIRMADO]` Los objetivos de operación `RPO 24 h` / `RTO 2 h` y `7 diarias / 4
semanales / 3 mensuales` ya están aceptados en security. **Esta SPEC no fija ni certifica
esos objetivos**; el ensayo puede contrastarlos, pero no declararlos cumplidos sin
evidencia.

### 4.4 DT7 — mapping y corte

`[CONFIRMADO]` DT7 exige mapping exhaustivo por campo/ID/apertura/archivo, corte,
discrepancias/excepciones, inventario privado y herramientas de importación aislada
(roadmap DT7). **Estado real: abierto.** Solo existe preparación documental/ficticia.

`[CONFIRMADO]` M3/M6 están aceptadas; M9–M13 ratificadas; M14 A confirmada como contrato
sin implementación; M4/M7/M15/M16 aceptadas como propuesta; **M1/M2/M5/M8 siguen pendientes
de evidencia real**. Aprobar el checklist no cierra DT7 ni autoriza importación.

`[CONFIRMADO]` Sin mapping revisado por el usuario y corte acordado, AC12 no tiene
correspondencia caso→campo y AC14 no puede distinguir una brecha de una omisión.

### 4.5 Decisiones de auditoría

| Decisión | Estado | Efecto sobre E4.12 |
| --- | --- | --- |
| **AUD-06 — AC-25/P3 de SPEC16** | Abierta; exige fuente real y autorización específica | Sin contraste autorizado no se declara equivalencia de Comida; AC12/AC13 quedan limitados a la matriz ficticia |
| **AUD-08 — DEV20/21/27 y gates DT7/E3.5/DT6** | Abierta; autorización separada | E4.5 y sus gates deben resolverse; E4.9 ya está integrada, con aceptación y DT6 real pendientes |
| **DT3/DT4** | Resueltas 2026-10-28 (cierre/fotos) | Base de la foto y de la versión; no se reabren |
| **DT9** | Pendiente (rectificación excepcional de ciclos antiguos) | Si el ensayo incluye ciclos rectificados, requiere decisión expresa |
| **DT10** | Pendiente (proveedor/despliegue fuera de STEP 4) | No se contrata ni despliega para el ensayo |

### 4.6 Regla de bloqueo

`[PROPUESTA]` El **ensayo integral final (nivel B)** no se autoriza si una dependencia no
está integrada, si su aceptación aplicable no está declarada o si falta cualquier entrada
de §5. Como máximo podrá autorizarse una **fase de preparación con fixtures (nivel A)** con
exclusiones explícitas, siempre que no se lea como equivalencia, custodia externa ni
recuperación operativa. La autorización de F3 debe declarar el nivel y el subconjunto de AC;
sin esa declaración no se ejecuta.

---

## 5. Entradas exigibles

`[CONFIRMADO]` Sin estas entradas no debería autorizarse el ensayo. Se describen por
**contenido mínimo**, no por procedimiento; los pasos operativos, plazos y umbrales
pertenecen a las fases de preparación y a las decisiones del usuario.

| Entrada | Contenido mínimo | Disponible hoy | Bloquea |
| --- | --- | --- | --- |
| **5.1 Copia coherente con WAL** | Snapshot coherente con su estado WAL; manifiesto (app, esquema, origen, instante, id); SHA-256; integridad/FK/esquema; ausencia de temporales y texto plano en destino | Snapshots/paquetes sintéticos y restore v27 Linux (E4.10 AC22, CI #257); sin copia externa | AC01, AC11 (nivel B); el nivel A puede usar copia sintética |
| **5.2 Claves y custodia** | Identidad `age` y clave de aplicación de 32 bytes custodiadas fuera del VPS, del disco de copias y de Git; copia de recuperación protegida y separada; prueba de descifrado | Ubicación, custodio y rotación sin decidir | AC01, AC08, AC09 (nivel B); nivel A con claves de fixture |
| **5.3 Entorno aislado** | Destino nuevo sin acceso a la base en servicio; loopback; red aislada; permisos privados `0700`/`0600`; Linux x86_64 aislado autorizado si se busca evidencia de plataforma | Equipo Linux x86_64 y configuración productiva del ensayo sin confirmar | AC01, AC08, AC10, AC16 (nivel B); nivel A puede usar entorno aislado disponible |
| **5.4 Fixtures** | Fixtures deterministas y ficticias que cubran IDs, aperturas, relaciones, plan, hechos, auxiliares y versiones de fotos en las versiones de esquema del corte | E4.10 y E4.11 tienen fixtures de v1/v2 y agregados; falta la fixture integral con todos los bloques y R1–R6/P1–P7 | AC02–AC07, AC12, AC13; el nivel A exige la fixture integral |
| **5.5 Matriz de equivalencia** | Casos v5.11 congelados con identificador, escenario R/P, procedencia, corte, valor esperado, unidad/precisión, regla y resultado observado | Referencia sanitizada; libro no inspeccionado; matriz sin congelar | AC12, AC13; el nivel A solo admite matriz sanitizada congelada |
| **5.6 Criterios por escenario** | Criterio explícito antes de ejecutar, resultado esperado y tratamiento de diferencias para limpio, corrupto, acceso y R1–R6/P1–P7 | No acordados; no se inventan umbrales | AC09, AC13, AC15 |
| **5.7 Evidencia** | Carpeta privada fuera de Git; formato de registro con acción, entorno, candidato, base, fecha y log crudo; sin datos personales ni secretos | Ruta y formato sin decidir | AC10, AC17 |
| **5.8 Autorización del ensayo** | Aprobación explícita e identificable, separada de la aprobación de la SPEC, del DEV y del merge; declara nivel A o B y AC incluidos | No existe | Todas las fases de ejecución |

`[CONFIRMADO]` No son entradas suficientes por sí solas: un CI verde, un restore sintético
previo, la aprobación de esta SPEC o la existencia de la matriz sanitizada.

`[PROPUESTA]` Gate mínimo por nivel, sin sustituir las autorizaciones de §6:

| Gate | Nivel A — fixtures | Nivel B — integral final |
| --- | --- | --- |
| Funcional | E4.9/E4.10/E4.11 con código integrado y fixtures disponibles; reservas declaradas | Aceptación aplicable de E4.9/E4.10/E4.11 declarada; E4.5/DT7 resueltos. Una exclusión solo cabe como brecha explícita que impide declarar equivalencia |
| Esquema | SHA de `test` con `schemaVersion=27`/`C27` congelado | Mismo SHA/corte congelado; cualquier cambio reinicia AC16 |
| DT6 | Ruta sintética de backup/restore; sin custodia externa | Destino externo, custodia de claves y restore previo autorizados |
| DT7 | Fuera o solo estructura ficticia; sin equivalencia | Mapping/corte revisados por el usuario |
| Oráculo | Matriz sanitizada congelada; sin equivalencia real | Matriz v5.11 revisada y contraste autorizado si se declara |
| Entorno | Aislado, sin PROD, con permisos privados | Entorno de ensayo autorizado con configuración productiva declarada |
| Evidencia | Carpeta privada y registro con logs crudos | Igual, con revisión QA independiente |
| Autorización | F3 nivel A explícita | F3 nivel B explícita y separada |

---

## 6. Fases y autorizaciones

`[PROPUESTA]` La entrega se ejecuta en cinco fases. **Cada fase exige autorización propia
y ninguna autoriza la siguiente**; aprobar la SPEC no autoriza preparar evidencias ni
ensayar.

| Fase | Objetivo | Entregable | Autorización requerida | Criterio de salida |
| --- | --- | --- | --- | --- |
| **F0 · SPEC** | Fijar requisitos, AC, entradas, fases, riesgos y exclusiones | Este documento y su testplan | Ninguna para redactar; aprobación del usuario para cerrar la fase | SPEC y testplan aprobados de forma explícita e identificable |
| **F1 · Decisiones** | Resolver destino, custodia, entorno, corte, matriz, carpeta de evidencias, alcance E4.10/E4.11 y límite AC-25/P3 | Registro de decisiones con fecha y responsable | Autorización específica de F1 | Decisiones §9 resueltas o declaradas fuera con brecha |
| **F2 · Preparación de evidencias** | Construir fixtures integrales, obtener/verificar la copia ficticia coherente, congelar la matriz, acordar criterios por escenario y habilitar el entorno aislado | Expediente de preparación con manifiesto, checksum, matriz congelada y criterios | Autorización específica de F2 | Entradas §5 aplicables al nivel autorizado, completas y revisadas; **no se ejecuta el ensayo integral** |
| **F3 · Ensayo autorizado** | Ejecutar los escenarios y recoger evidencia cruda, en el nivel A o B que declare la autorización | Evidencia por AC y por escenario | Autorización explícita e identificable del ensayo, con nivel A/B y AC incluidos | Escenarios ejecutados o `BLOCKED` con causa; sin PASS inferido; un nivel A no se presenta como integral |
| **F4 · Informe y brechas** | Consolidar resultados, diferencias y lista de brechas para P7 | Informe E4.12 con AC01–AC17 y lista de discrepancias | Autorización de F4 para publicar/registrar el informe | Informe revisado por QA independiente y decisión de gate P7 sin inferencias |

`[CONFIRMADO]` La autorización de publicación de rama/PR no sustituye la autorización del
ensayo ni la del merge (approvals). `[PROPUESTA]` La autorización de F3 debe indicar
expresamente si se ejecuta nivel A (fixtures), nivel B (integral final) o ambos, y qué AC
quedan fuera. Sin esa indicación, F3 no se inicia. Un nivel A puede producir un informe
parcial de brechas, pero no cierra E4.12 ni P7.

---

## 7. Riesgos y huecos

> **Nota (2026-11-08):** los estados se actualizan a `test` `7477e86` y a los informes de
> aceptación E4.10/E4.11. Las aceptaciones de E4.9/E4.10/E4.11 siguen abiertas; el código
> está integrado.

| Riesgo/hueco | Evidencia actual | Impacto en E4.12 | Responsable / gate |
| --- | --- | --- | --- |
| **DT6 abierto** | Sin destino externo; restores sintéticos v19/v20/v27 | AC01 no puede acreditar recuperación operativa desde copia externa; P7 bloqueado | Usuario fija destino/custodia; gate DT6 |
| **Sin restauración operativa probada** | Disponibilidad de Linux x86_64 por confirmar | El ensayo integral no tiene soporte real donde apoyarse | Usuario + ejecutor autorizado |
| **DT7 abierto** | Mapping/corte sin aprobar; M1/M2/M5/M8 pendientes de evidencia | AC12 sin correspondencia campo→caso; AC14 no distingue brecha de omisión | Usuario revisa mapping |
| **Flake SQLite B3** | `SQLITE_IOERR_SHORT_READ` intermitente; 0 reproducciones macOS; reproducción Linux `UNRUN` | Riesgo de falso negativo/positivo en la suite y en la confianza del restore; no es corrupción demostrada | Investigación separada; no cerrar por CI verde |
| **E4.5 sin DEV** | Spec aprobada; 59 AC `UNRUN`; DT7 pendiente | Falta archivo/histórico precontrol y universo DT7 para AC06/AC12 | Autorización DEV E4.5 |
| **E4.9 aceptación abierta** | Merged `0176ffc`; QA APTO CON RESERVAS; AC-09 y cierre real sujetos a DT6 | El contrato de cierre/foto existe, pero su aceptación y el cierre real no; AC05/AC07 nivel B dependen de esa declaración | QA/usuario; DT6 |
| **E4.10 aceptación abierta** | DEV I1–I8 merged; 23 PASS (fixtures)/1 PARCIAL; AC15 real `BLOCKED` | v1/v2 existen para fixtures; la aceptación global y el extremo real no | Usuario/QA; decisión sobre reserva AC15 |
| **E4.11 aceptación abierta** | DEV I1–I6 merged; 10 PASS/5 PARCIAL con fixtures y 15 `BLOCKED real`; el tablero aún marca I4–I6 pendientes | Hay consulta y agregado v27 para fixtures, pero no aceptación ni validación real; AC07/AC13 nivel B condicionados | Coordinador/QA; conciliar tablero sin reauditar aquí |
| **E4.7 aceptación pendiente** | Integrada `0e89562`; AC3 `PARCIAL`, AC10–15 `BLOCKED`, AC19 `UNRUN` | Escenario R3/R6 y flujo anual incompletos | Usuario/QA |
| **Oráculo no inspeccionado** | Referencia sanitizada; libro no inspeccionado por agentes; AC-25/P3 abierto | AC12/AC13 no tienen oráculo estable ni equivalencia real de Comida | Usuario/asesor; AUD-06 |
| **Esquema y candidato** | `test` `7477e86` con v27/C27; C26 y C25 anteriores; SPEC35 sin tags implementados | El ensayo debe fijar SHA, versión y contrato y no mezclar cortes; un cambio reinicia AC16 | Coordinador + ejecutor; AC16 |
| **Discrepancia tablero vs informes** | Tablero declara E4.10/E4.11 con 24/15 AC `UNRUN`; los informes registran PASS de fixtures y E4.11 E2E I6 | Riesgo de leer como no ejecutado lo que ya tiene evidencia, o como aceptado lo que sigue abierto | Coordinador; conciliar sin reauditar aquí |
| **Restore sintético tomado como operativo** | Informes v19/v20/v27 declaran sus límites | Falsa sensación de recuperación | Declaración de límites; AC17 |
| **Temporales/forense** | `backup`/`restore` usan temporales privados; no se promete borrado seguro | La evidencia no puede afirmar ausencia forense de restos | Volumen cifrado en destino |
| **Expansión a despliegue/P7** | Roadmap «Fuera» | Cambio de alcance no autorizado | §8; autorización separada |
| **Tags/dispatch no implementados** | SPEC35: diseño aprobado, D11 abierta; sin tags operativos | F3 no puede depender de un tag ni de un despliegue; debe usar SHA de `test` | Coordinador; SPEC35 |

---

## 8. Fuera de alcance

`[CONFIRMADO]` Esta SPEC **no**:

- ejecuta ensayos, restauraciones, backups ni pruebas con datos reales;
- migra el maestro, importa el Excel ni crea datos operativos;
- despliega, toca el VPS, contrata servicios, discos o almacenamiento;
- cambia el maestro ni activa el régimen productivo;
- define procedimientos operativos definitivos, automatización, retención, custodia,
  destino externo o monitorización;
- aprueba UI, wireframes, política de composición de fotos de periodo ni decisiones
  DT9/DT10;
- declara equivalencia económica real, certificación de seguridad ni cumplimiento de
  RPO/RTO;
- cierra E4.12, ningún AC, DT6, DT7 ni el gate P7.

`[CONFIRMADO]` Cualquier acción de la lista anterior exige aprobación explícita e
identificable y, cuando corresponda, su propia especificación y autorización.

---

## 9. Decisiones que la aprobación debe resolver

`[PENDIENTE]` Esta SPEC no fija estos valores; la fase F1 debe registrarlos antes de
preparar evidencias. No se inventan plazos, umbrales, rutas ni proveedores.

| Decisión | Qué debe fijar | Fuente |
| --- | --- | --- |
| Destino y segunda copia | Discos/rutas privadas existentes, capacidad y frecuencia de traslado | DT6 §6 |
| Canal de exportación | Cómo llega la copia al soporte externo y quién lo verifica | DT6 §6 |
| Custodia de identidad `age` | Ubicación, custodio, copia de recuperación y rotación | DT6 §6 |
| Retención y poda | Inicio del calendario, responsable y registro | DT6 §6 |
| `--allow-older` | Autorización, motivo, riesgo y alcance para copias >24 h | DT6 §3.5.1 |
| Equipo de ensayo | Linux x86_64 aislado disponible o alcance alternativo declarado | DT6 §4/§6 |
| Configuración productiva | `NODE_ENV`, `DATABASE_PATH`, `AUTH_KEY_PATH`, `APP_ORIGIN` y aislamiento | DT6 §3.1.1 |
| Carpeta de evidencias | Ruta privada fuera de Git y formato | DT6 §6 |
| Corte y matriz | Fecha/corte común y revisión de la matriz v5.11 | E4.12-AC2; DT7 |
| Datos reales | Si se autoriza contraste privado (AC-25/P3) o se declara límite | AUD-06 |
| **Nivel de F3** | Si se autoriza solo nivel A (fixtures), solo nivel B o ambos, con AC incluidos y exclusiones | §2.5, §4.6, §6 |
| **Aceptación E4.9/E4.10/E4.11** | Si sus PASS de fixtures y reservas (`PARCIAL`/`BLOCKED real`) se aceptan como corte de E4.12 o si se espera a su cierre; conciliar el tablero con I1–I6 de E4.11 | Informes de aceptación; tablero |
| **Aceptación E4.7** | AC3 `PARCIAL`, AC10–15 `BLOCKED`, AC19 `UNRUN`; decidir si se acepta como corte o se excluye con brecha explícita | Informe E4.7; tablero |
| **Candidato y tags** | SHA congelado de `test` con v27/C27; confirmar que no se crea tag ni se depende de SPEC35 para F3 | SPEC35; AC16 |
| **Alcance E4.5/DT7** | Si E4.5 y el archivo precontrol entran en el corte o se excluyen con brecha explícita | roadmap E4.12-AC3; DT7 |

---

## 10. Cierre de esta SPEC

`[PENDIENTE]` La SPEC solo queda aprobada con una aprobación explícita e identificable del
usuario. Esa aprobación no autoriza DEV, ensayo, datos reales, migración, VPS ni merge, y
no cierra ningún AC. La ejecución del ensayo requiere las autorizaciones separadas de §6.
