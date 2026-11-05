# E4.10 — Preparación documental: reapertura y nuevo cierre (2026-11-05)

**Estado:** `[PROPUESTA]` documental — **NO APROBADA.** No autoriza DEV E4.10 ni E4.5, no
modifica código, esquema ni migración, no abre datos reales ni Excel y no fusiona nada.
Los AC de E4.10 y los 59 AC de E4.5 siguen `UNRUN`.

- **Base:** `main` **`3842831`** (2026-11-05), con E4.9 integrado en `0176ffc` y E4.5 en
  `a806fd9`.
- **Autorización:** análisis y preparación documental de E4.10 solicitados por el usuario
  el 2026-11-05, en paralelo con DT7/#218.
- **Revisión 2026-11-05:** D1–D7 y D9 se consideran una base razonable, **no aprobada**;
  D8 corregida, **no aprobada**; paquetes D1/D2/D8/D9 y D5/E4.11 preparados para aprobación
  posterior.
- **Alcance:** diagnóstico de SPEC28, contratos heredados, D1–D9, reapertura, versionado
  de fotos, protecciones, idempotencia, dependencias E4.11/E4.12 y próximos pasos.
- **Fuera de alcance:** implementación, SQL, migración, rutas nuevas, datos reales,
  reaperturas/cierres reales, merge y despliegue.

## 0. Registro de coordinación

| Frente | Sesión / responsable | Alcance | Inicio / fin | Solapamiento |
| --- | --- | --- | --- | --- |
| A — DT7/#218 | coordinador | Verificación de #218 `eb256db`, CI y QA | 13:47–13:52 UTC | Solo lectura; sin escritura |
| B — E4.10 | `E410-PREP-01` `ses_e5408c2aeffeeHmAiQaATvbdfS` | Análisis documental E4.10 | 13:47–13:52 UTC | Comparte lectura de `main`; salida disjunta |

- Un único subagente para el Frente B; no se creó un agente para el Frente A porque solo
  requería verificación. Sin agentes redundantes.
- Worktree independiente: `docs/e410-preparation`, base histórica `136713b`; revisión actual
  sobre `3842831`.
- Sin ediciones concurrentes: el subagente fue read-only; la consolidación la hace el
  coordinador.
- **Actualización posterior:** #218 mergeado en `c4706a6` y #220 en `3842831`; el contenido
  D1–D9 se actualiza con la corrección D8 y los paquetes, sin cambiar el diagnóstico.

## 1. Diagnóstico de vigencia de SPEC28

| Supuesto en SPEC28 | Estado real | Corrección documental |
| --- | --- | --- |
| E4.9 se lee en PR #200 OPEN/draft, head `2fe5d01`, sin QA ni merge | E4.9 **MERGED** en `0176ffc`; QA **APTO CON RESERVAS**; CI post-merge `42000330143` PASS; `a806fd9` es E4.5 (#216), no E4.9 | Actualizar cabecera y referencias; no confundir ambos SHA |
| Los AC de E4.9 siguen todos `UNRUN` sin matices | El testplan E4.9 registra PASS de fixtures/parciales; no hay PASS de aceptación ni cierre real | Distinguir PASS de fixture/parcial de PASS de aceptación |
| E4.9 solo implementa v1; no hay re-cierre; estado solo `Cerrado`; auditoría solo dos acciones, marcado como provisional | Es el contrato **implementado y mergeado**: `confirmCierre` fija `version=1`, `ALREADY_CLOSED` remite a E4.10; estado persistido `Cerrado`; auditoría limitada | Convertir en `[CONFIRMADO: E4.9]`; dejar pendiente solo la extensión de E4.10 |
| No se asume versión de esquema nueva; se decide tras E4.9 | v25 está ocupada por E4.9; E4.10 no reserva versión | Declarar «v25 ocupada; E4.10 sin versión en SPEC28» |
| Endpoints/formas/versiones provisionales de E4.9 | La superficie E4.9 existe y está mergeada; las rutas de E4.10 no están fijadas | Separar superficie E4.9 observada de rutas E4.10 pendientes |
| T1 incluirá Ventas si E4.9 confirma su ampliación | T1 de E4.9 ya incluye Ventas E4.2 (alta, rectificación, anulación, cambio de fecha) en implementación/testplan | Implementación/testplan confirmados; texto de SPEC27 pendiente de enmienda para Ventas |
| Contexto de tablero: E4.11/SPEC29 y E4.12/SPEC30 no iniciadas | Existen en `main` como **DRAFT**, sin aprobación ni DEV; decisiones P1–P8/M1–M6 y DT6/DT7 abiertas | Actualizar estados; no usar la cola de decisiones como vigencia |
| Base `docs/next-packages` `eefc20d`; DT6 abierto y E3.5 condiciona | SPEC28 está en `main`; DT6 sigue abierto; E3.5 integrado pero AC-15 PARCIAL | Actualizar base y precisar E3.5 |

**Veredicto:** SPEC28 conserva estructura y semántica, pero su línea base E4.9 y varios
marcadores provisionales están obsoletos. Puede actualizarse sin decidir D1–D9; no puede
aprobarse hasta cerrar las decisiones materiales y coordinar D5 con E4.11.

## 2. Contratos heredados de E4.9

| Contrato | Estado | Uso en E4.10 |
| --- | --- | --- |
| Cierre v1 + foto completa | `[CONFIRMADO]` transacción única; foto con identidad, ventana, S0, plan, hechos, clasificación, inversión, auxiliares, cobertura y backup | Base del re-cierre; E4.10 no reimplementa la foto |
| Inmutabilidad | `[CONFIRMADO]` triggers de no-update/no-delete en cierre, foto y auditoría | v1 y anteriores intactas; sin `PATCH`/`DELETE` |
| Auditoría append-only | `[CONFIRMADO]` actor, UTC, motivo, fingerprint; dos acciones en E4.9 | E4.10 requiere acciones nuevas para reapertura/re-cierre |
| Idempotencia y concurrencia | `[CONFIRMADO]` clave de intento, replay idéntico, `IDEMPOTENCY_CONFLICT`, `REVISION_CONFLICT`/`IMPACT_CHANGED` | Patrón reutilizable; E4.10 decide claves y estado esperado |
| T1/T2/T3 base | `[CONFIRMADO: implementación E4.9/testplan AC-04; enmienda SPEC27 pendiente]` T1 bloquea (incluye Movimientos, Compras y Ventas), T2 audita, T3 permite | Dentro de la ventana, el alcance T1 depende de D2 |
| Cierre fuera de orden | `[CONFIRMADO]` motivo y coherencia al mismo corte; bloqueo si no es explicable | Un cierre posterior impide la reapertura ordinaria |
| Estado y foto por versión | `[CONFIRMADO]` `getCierreEstado`, `previewCierre`, `getFotoCierre(ciclo, versión?)`; solo v1 | E4.10 añade la versión vN y el estado reabierto |
| Superficie E4.9 | `[CONFIRMADO]` estado, preflight, foto y cierre implementados | E4.10 no fija rutas nuevas aquí |

**Provisional:** representación de la reapertura (evento, tabla, estado o versión), extensión
de auditoría, camino de re-cierre (`MAX(version)+1`), política de versión vigente/v3, alcance
T1 en la ventana, cancelación, matriz D4, `SIN_CAMBIOS`, composición E4.11 y versión de
esquema de E4.10.

## 3. Decisiones D1–D9

> `D4` en esta tabla es **D4-E4.10** (revalidación), no D4-E4.5. No se reabren D4/D14 de
> SPEC20 ni Q5=A/Q7=A/Q10=A.

| Decisión | Estado | Recomendación | Alternativas y riesgos | Decide | Evidencia |
| --- | --- | --- | --- | --- | --- |
| **D1** Último cierre y reserva | Definición `[CONFIRMADO]`; reserva/v3 usuario | **A**: el reabierto reserva la posición hasta re-cierre o cancelación; una sola ventana; v3+ solo sobre la última versión y secuencial; **no se generan cierres posteriores incompatibles durante la reserva** | B multiplica ventanas/versiones; C añade bloqueo y trabajo programado | Usuario | P5/DT3; SPEC27; roadmap E4.10 |
| **D2** Ventana y alcance T1 | Usuario; base T1 `[CONFIRMADO]` | **B acotada**: T1 solo en la ventana del ciclo para Movimientos, Compras y Ventas; nunca S0/`inicio`/`Fin`; auditoría por escritura; re-bloqueo al re-cerrar/cancelar | A deja sin vía la corrección T1; C añade vencimiento automático | Usuario | SPEC27 T1/T2/T3; testplan E4.9 |
| **D3** Motivo y actor | Usuario; límites/actor `[CONFIRMADO]` | **B+C**: motivo separado al reabrir y al re-cerrar; 1000 caracteres; actor de sesión; sin roles nuevos | A pierde el motivo de la corrección; C no distingue personas | Usuario | SPEC27 auditoría; E4.10-AC2 |
| **D4-E4.10** Revalidación | No modificar S0 `[CONFIRMADO]`; matriz/nivel usuario; agregados dependen de E4.11 | **A** para cierres posteriores + **B** para dependencias no cerradas: S0/plan siguiente, fotos, auxiliares, agregados E4.11, precontrol; contradicción bloquea; aviso solo si se declara no bloqueante | C puede dejar cadena incoherente | Usuario | E4.10-AC1/AC3; roadmap |
| **D5** Versión vigente y agregados | Depende de E4.11 + usuario | **A alineada con P4-A**: v1 visible etiquetada; agregados nuevos excluyen el ciclo reabierto y lo marcan `PendienteReCierre`; agregados ya generados congelados sin recálculo | B muestra total que puede no coincidir; C exige nueva versión de agregado | Usuario + E4.11 | DT4; SPEC27; SPEC29 P1/P4/P5 |
| **D6** Plan y auxiliares | Usuario; P1/AC-17 `[CONFIRMADO]` | **A+C**: plan vivo editable; `SinPlan`↔`Capturado` con motivo; v2 repite el contrato completo y guarda comparación con v1; auxiliares desde fuentes vigentes; fuente ausente `No disponible` | B impide rectificar plan; cambios silenciosos sin comparación | Usuario | P1; SPEC27 foto; E4.10-AC19 |
| **D7** Idempotencia y concurrencia | Patrón `[CONFIRMADO]`; comportamiento observable usuario | **A+B+C**: claves separadas reapertura/re-cierre; versión/estado esperado; transacción inmediata; reintento idéntico seguro; payload distinto/versión obsoleta → conflicto; nunca dos versiones | B solo no resuelve dos pestañas; C solo no cubre reintentos | Usuario | E4.9 AC-10/11; testplan |
| **D8** Fallo/cancelación/recuperación | Usuario | **A + B corregida**: reapertura y re-cierre atómicos; cancelación sin foto **solo si no hay cambios materiales**; con cambios, re-cierre vN+1 o recuperación auditada; **C descartada** | Quedarse reabierto bloquea si D1 no prevé salida; B sin condición podría perder cambios | Usuario | SPEC28; análisis E4.10; §3.2 |
| **D9** Ciclos antiguos/DT9 | `[CONFIRMADO]`; solo confirmar | **A**: E4.10 solo último cierre; DT9 fuera, con SPEC propia | B rompe P5/DT9 y multiplica impacto | Usuario | P5/DT9; roadmap |

### 3.1 D1 — precisión: reserva del último cierre

Mientras `Reabierto(vN)` conserva la posición de último cierre:

- no se puede registrar ni cerrar un cierre posterior que invalide la reserva (todo cierre
  con `Fin` posterior mientras la reserva esté activa, salvo resolución D8); la creación de
  un ciclo por sí sola no se impide;
- si aparece un cierre posterior por carrera o cierre tardío, el re-cierre se detiene y la
  ventana se resuelve según D8, sin tocar el cierre posterior;
- con cierre posterior y cambios materiales, D8-B2-A (re-cierre `vN+1`) no aplica: se
  resuelve por B (reversión auditada) o C (permanecer reabierto hasta decisión/plazo);
- no se abre una segunda ventana: la reapertura de otro ciclo se rechaza mientras la
  reserva esté activa;
- la reserva termina con el re-cierre `vN+1` o con la cancelación/recuperación de D8;
- la fecha de registro no altera la posición; manda el `Fin` cronológico y la ausencia de
  otro cierre posterior.

Esta precisión no decide D1; describe el efecto de la opción A recomendada. El
brainstorming de SPEC28 decía que la reserva no impide cerrar un ciclo posterior; esta
precisión lo acota a cierres incompatibles y debe ratificarse como parte de D1.

### 3.2 D8 — corrección: cancelación y recuperación

**Principio:** no se puede devolver un ciclo a `Cerrado(vN)` sin nueva fotografía si durante
la ventana se alteraron hechos o valores fotografiados. La cancelación sin versión solo es
válida cuando no hay cambios materiales.

- **D8-B1 — sin cambios materiales:** `Reabierto(vN) → Cerrado(vN)` mediante evento
  auditado, sin foto nueva; `vN` y las anteriores intactas y consultables; T1 se re-bloquea;
  el motivo de cancelación se conserva.
- **D8-B2 — con cambios materiales:** no se permite cancelar sin nueva versión. Opciones:
  - **A (recomendada):** re-cerrar `vN+1` con motivo «cancelación con cambios» y foto
    completa; el cambio queda preservado y auditado. **No aplica si existe un cierre
    posterior.**
  - **B:** revertir los cambios con auditoría y verificación exacta y, solo entonces,
    cancelar sin foto. Solo si la reversión es completa, demostrable y no altera `vN` ni las
    anteriores;
  - **C:** mantener `Reabierto(vN)` hasta resolver; salida de emergencia, no definitiva.
- **Detección de cambio material:** comparar el estado actual con la versión reabierta
  `vN` (`v1` solo si `N=1`): hechos T1/T2, plan, auxiliares, valores fotografiados y
  fingerprint/preflight. Si no se puede demostrar la ausencia de cambios, se trata como
  material (fail closed).
- **Recuperación auditada:** registrar motivo, alcance, comparación, actor/UTC, versión y
  resultado; no se descartan cambios en silencio ni se presenta `Cerrado(vN)` como si la
  ventana no hubiera existido.
- **Fallo del re-cierre:** el ciclo sigue `Reabierto(vN)`, `vN` y anteriores consultables y
  sin foto parcial; el reintento es posible.

**No decidido:** el texto exacto de la comparación, los campos que cuentan como materiales
y si B se admite. D8 sigue siendo decisión del usuario.


**No reabrir:** P5 (solo último cierre sin posteriores; v1/v2 intactas; fecha/motivo),
DT4 (v1 inmutable, v2, versiones consultables, retención, agregado con versión registrada
y congelado) y los contratos E4.9 ya mergeados.

## 4. Comportamiento de reapertura

### 4.1 Estados

| Estado | Significado | Estado contractual |
| --- | --- | --- |
| `SinCierre` | No hay cierre; el cierre es E4.9 | `[CONFIRMADO]` |
| `Cerrado(v1)` | Único estado persistido hoy; E4.9 inserta v1 y bloquea el segundo cierre | `[CONFIRMADO]` |
| `Cerrado(vN)` | Versión nueva tras re-cierre | `[PROPUESTA]`; `MAX+1` existe en trigger, camino no implementado |
| `Reabierto(vN)` | Ventana de rectificación sobre la última versión cerrada | `[PROPUESTA]`; sin estado/endpoint |
| Cancelación | Vuelta a `Cerrado(vN)` sin foto **solo sin cambios materiales**; con cambios, `vN+1` o recuperación auditada | `[PENDIENTE D8 corregida]` |

### 4.2 Transiciones

- `Cerrado(vN) → Reabierto(vN)`: `[PROPUESTA]`, auditada, sin foto.
- `Reabierto(vN) → Cerrado(vN+1)`: `[CONFIRMADO]` en «versión nueva sin alterar v1»;
  `[PROPUESTA]` en operación y secuencia.
- `Reabierto(vN) → Cerrado(vN)` por cancelación: `[PENDIENTE D8]` solo sin cambios
  materiales; con cambios, `vN+1` o recuperación auditada.
- Prohibidas: `SinCierre → Reabierto`, `Cerrado(vN) → Cerrado(vN+1)` sin reapertura, doble
  reapertura, reapertura de versión histórica, `UPDATE`/`DELETE` de cierre/foto/versión.

### 4.3 Versiones

- `[CONFIRMADO]` v1 y su foto son inmutables y consultables; el re-cierre crea vN y no pisa
  v1; retención permanente.
- `[PENDIENTE D5]` Mientras el ciclo está reabierto y sin vN, la regla de «vigente» no está
  cerrada. Candidata: v1 consultable etiquetada como última versión cerrada; agregados
  nuevos excluyen y marcan; no presentar v1 como vigente sin marca.
- `[PENDIENTE D1/D5]` Repetibilidad tras v2 (v3) y mezcla de versiones entre ciclos.

### 4.4 Fallo y recuperación

- `[PROPUESTA]` Reapertura atómica: evento, estado y auditoría en una transacción; fallo →
  rollback sin estado parcial.
- `[PROPUESTA]` Re-cierre atómico: cierre, foto, auditoría e intento en una transacción;
  fallo → sin vN ni foto parcial; el ciclo sigue `Reabierto(vN)` y v1 consultable.
- `[CONFIRMADO]` El patrón de transacción única y rollback es el de E4.9; DT6 sigue siendo
  gate del cierre real, no de la reapertura documental.
- `[PROPUESTA]` Cancelación: sin cambios materiales, cierre sin foto; con cambios, `vN+1` o
  recuperación auditada (D8 corregida). La detección es fail-closed.

## 5. Fotografías y E4.11

| Dimensión | Regla vigente | Decide E4.11 | Efecto en E4.10 |
| --- | --- | --- | --- |
| Versionado por ciclo | v1 inmutable; vN; todas consultables; retención permanente | M5/P7 selección/consulta y `seleccionAplicada`; la política de versiones/estado reabierto es D5/DT4 | E4.10 crea vN; E4.11 la lee |
| Agregados trimestre/año | DT4: usan la versión vigente al generarse, registran cuál y quedan congelados | M2/P2 naturaleza del agregado | E4.10 no implementa agregados |
| Mezcla de versiones | DT4 exige registrar la versión usada | M1/P5 prohibir o permitir con registro | Cada ciclo debe tener versión identificable |
| Ciclo reabierto sin vN | Sin regla aprobada | M1/P4 excluir/marcar/bloquear | D5 ↔ P4 no se pueden separar |
| Retención | Fotos/versiones permanentes | M4/P6 agregados | E4.10 no poda |
| Consulta | Sin recálculo; ausencia ≠ 0 | M5/P7 por ciclo/versión/periodo/corte | E4.10 expone v1/vN |
| Archivo E4.5 | No es foto ni compone totales | M6 excluir o vista separada | E4.10 no usa E4.5 como foto |

**Frontera:** E4.10 aporta vN y estado reabierto; D5 se decide conjuntamente con E4.11
(P4/P5). E4.11 decide composición de periodos, agregados y consulta. E4.11 sigue DRAFT,
sin aprobación ni DEV.

## 6. Protecciones e idempotencia

| Nivel | Fuera de la ventana | Dentro de la ventana |
| --- | --- | --- |
| T1 | `[CONFIRMADO: implementación E4.9/testplan; enmienda SPEC27 pendiente]` 409 `HISTORY_LOCKED` por fecha para Movimientos/Compras/Ventas; S0 e `Inicio`/`Fin` por ciclo cerrado | `[PENDIENTE D2]`: A lo mantiene bloqueado; B permite solo dentro del ciclo y ventana, con auditoría; S0/`inicio`/`Fin` siempre bloqueados |
| T2 | `[CONFIRMADO]` impacto + motivo + auditoría; foto intacta | `[CONFIRMADO]` se permite con las mismas guardas |
| T3 | `[CONFIRMADO]` permitido; no elude T1/T2 | `[CONFIRMADO]` se permite |

- `[CONFIRMADO]` Con cierre posterior no hay reapertura ordinaria; no se toca el cierre
  posterior.
- `[PROPUESTA]` Si aparece un cierre posterior durante la ventana, el re-cierre se detiene
  y se resuelve según D8.
- `[CONFIRMADO]` La revalidación es de solo lectura; no modifica S0 ni plan ajenos.
- `[PROPUESTA]` Una sola ventana por ciclo y vez; dos reaperturas concurrentes: una gana,
  la otra recibe conflicto.
- `[CONFIRMADO]` Reintento idéntico seguro; payload distinto `IDEMPOTENCY_CONFLICT`; cambio
  concurrente `REVISION_CONFLICT`/`IMPACT_CHANGED`; sin escritura.
- `[PROPUESTA]` Claves separadas reapertura/re-cierre, versión/estado esperado y transacción
  inmediata por ciclo.

**Códigos candidatos** (semántica, no rutas ni contrato definitivo): `NO_ES_ULTIMO_CIERRE`,
`CIERRE_POSTERIOR_EXISTENTE`, `CICLO_NO_CERRADO`, `REAPERTURA_YA_ACTIVA`,
`REAPERTURA_NO_ACTIVA`, `VENTANA_RECTIFICACION_CERRADA`, `REVALIDACION_BLOQUEANTE`,
`VERSION_ESPERADA_OBSOLETA`, `FOTO_NO_ENCONTRADA`, `DT9_NO_HABILITADO`.

## 7. Dependencias reales

| Dependencia | Qué necesita E4.10 | Qué no necesita | Bloqueo |
| --- | --- | --- | --- |
| E4.9 | v1 mergeado, foto inmutable, auditoría, idempotencia, T1/T2/T3 | Que E4.9 implemente el re-cierre | Ninguno para documentar; re-cierre es extensión |
| E4.11 | D5 y coherencia P1/P4/P5 | DEV, API, esquema o agregados | **D5 ↔ P4/P5** bloquea aprobar SPEC28/SPEC29 |
| E4.12 | Nada funcional; solo preservación de versiones/metadatos en restore | Ensayo, matriz, DT6 | Ninguno para E4.10; E4.12 es downstream y tiene bloqueos propios: DT6/DT7, E4.5, E4.7, E3.5/E3.6 (AC-15 PARCIAL), AUD-06 y E4.10/E4.11 |
| E4.5/DT7 | Revalidación de solo lectura del precontrol | DEV E4.5 ni mapping real | Afecta a datos reales; 59 AC UNRUN |
| DT6/T-BKP | Evidencia para re-cierre real | DEV con fixtures y especificación | Bloquea cierre real, no documentación |
| Esquema | Versión posterior a v25, decidida en paquete DEV | Asumir v25/v26 en SPEC28 | Bloquea DEV, no SPEC |
| D1–D9 | Cierre de decisiones materiales | — | Bloquea aprobar SPEC28 |

**Dirección:** E4.10 depende de E4.9 integrado en `0176ffc` (aceptación funcional y cierre
real pendientes), de D5/E4.11 y de D1–D9; **no** de E4.12. E4.11 depende de E4.10 para
P4/v2. E4.12 depende de E4.10/E4.11 integrados.

## 8. Próxima fase

### 8.1 Actualizable en SPEC28 sin decisión

- Cabecera/base: E4.9 mergeado `0176ffc`, QA APTO CON RESERVAS, CI/E2E; `main` `3842831`;
  aclarar que `a806fd9` es E4.5.
- Convertir solo los marcadores que describen la superficie E4.9 ya integrada (v1,
  triggers, acciones `cierre`/`cierre_fuera_de_orden`, endpoints E4.9); mantener
  `[PENDIENTE]` los que dependen de D1/D5/D8, de la forma de reapertura y de la versión de
  esquema.
- Confirmar que E4.9 no implementa re-cierre, `version=1` y estado persistido `Cerrado`.
- Añadir T1 Ventas como implementación/testplan heredado; enmienda de SPEC27 pendiente.
- Actualizar E4.11/E4.12: DRAFT en `main`, sin aprobación ni DEV.
- Mantener D1–D8 abiertas y D9 pendiente de confirmación explícita; todos los AC E4.10
  `UNRUN`; no convertir PASS de fixtures E4.9 en PASS de aceptación.
- Actualizar el testplan: retirar «PR #200 OPEN/draft» y conservar regresiones E4.9.

### 8.2 Paquetes de decisión preparados (no aprobados)

**Paquete 1 — D1/D2/D8/D9: integridad de la ventana.**

- **D1:** reserva de último cierre; prohibición de registrar/cerrar cierres posteriores
  incompatibles mientras la reserva esté activa (la creación de un ciclo por sí sola no se
  impide); v3+ secuencial sobre la última versión.
- **D2:** T1 acotada a la ventana para Movimientos, Compras y Ventas; S0/`inicio`/`Fin`
  siempre bloqueados; auditoría por escritura; re-bloqueo al cerrar/cancelar.
- **D8 corregida:** cancelación sin foto solo sin cambios materiales; con cambios, `vN+1`
  con foto (si no hay cierre posterior) o recuperación auditada B/C; detección fail-closed;
  no se descartan cambios en silencio.
- **D9:** confirmar E4.10 solo último cierre y DT9 fuera.
- **Preguntas para aprobar:** ¿se acepta la reserva y la prohibición de cierres posteriores?
  ¿se permite `v3+` secuencial o la rectificación es única? ¿D2-B acotada? ¿D8-B1/B2 con
  re-cierre `vN+1` como opción A? ¿qué campos cuentan como cambio material? ¿con cierre
  posterior y cambios, B o C? ¿D9-A?

**Paquete 2 — D5/E4.11: versión vigente y agregados.**

- **D5:** v1 visible y etiquetada mientras el ciclo está reabierto; agregados nuevos
  excluyen el ciclo y lo marcan `PendienteReCierre`; agregados ya generados congelados;
  v3 solo sobre la última versión.
- **E4.11 P1/P4/P5:** selección/consulta de versión, tratamiento del ciclo reabierto y
  composición de periodos; no se decide en E4.10.
- **Preguntas para aprobar:** ¿se acepta D5-A? ¿se confirma `PendienteReCierre`? ¿P4
  excluye o solo marca? ¿P5 permite mezclar versiones con registro?

**Base razonable, no aprobada:** D3/D7 (auditoría y concurrencia) y D4/D6 (dependencias)
siguen como propuestas para paquetes posteriores; no forman parte de estos dos paquetes.

### 8.3 Secuencia recomendada

1. **E4.10-DOC-01:** en curso en PR #221; solo vigencia E4.9 y marcadores obsoletos.
2. **Paquete 1 (D1/D2/D8/D9):** presentar para aprobación; es el bloque de integridad.
3. **Paquete 2 (D5 + E4.11 P1/P4/P5):** presentar conjuntamente con E4.11.
4. **D3/D7 y D4/D6:** base razonable, no aprobada; paquetes posteriores.
5. **Revisión independiente y aprobación de SPEC28.**
6. **Paquete DEV de E4.10:** gate separado, no autorizado.
7. **E4.11** avanza tras D5; **E4.12** sigue bloqueado, entre otros, por DT6/DT7, E4.5,
   E4.7, E3.5/E3.6 (AC-15 PARCIAL), AUD-06 y E4.10/E4.11; el roadmap exige E1–E3 y
   E4.1–E4.11.

**Siguiente acción única:** cerrar `E4.10-DOC-01` (#221) y presentar el paquete 1
(D1/D2/D8/D9) para aprobación; después, el paquete 2 con E4.11.

## 9. Evidencia y límites

- **Comprobaciones:** base histórica `main` `136713b` y revisión actual `3842831`; lectura
  de SPEC28, brainstorming,
  testplan, SPEC27/E4.9, SPEC29/E4.11, SPEC30/E4.12, roadmap, tablero, brief E4.9, alcance
  E4.11, requisitos E4.12 y cola de decisiones.
- **Sesión:** `E410-PREP-01` `ses_e5408c2aeffeeHmAiQaATvbdfS`, read-only; inicio/fin
  aproximados 13:47–13:52 UTC.
- **Sin datos reales:** no Excel, base, extracto, credenciales, red ni operaciones.
- **Sin suites:** no se ejecutó nada; todos los AC siguen `UNRUN`.
- **Sin cambios funcionales:** no código, SQL, migración, esquema, rutas ni despliegue.
- **Sin merge:** esta propuesta no se fusiona; #204/#205 siguen como propuestas.
- **Límite:** no cierra E4.10, no aprueba D1–D9, no autoriza DEV y no sustituye la decisión
  del usuario.
