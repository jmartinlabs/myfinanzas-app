# E4.10 — Preparación documental: reapertura y nuevo cierre (2026-11-05)

**Estado:** `[PROPUESTA]` documental — **NO APROBADA.** No autoriza DEV E4.10 ni E4.5, no
modifica código, esquema ni migración, no abre datos reales ni Excel y no fusiona nada.
Los AC de E4.10 y los 59 AC de E4.5 siguen `UNRUN`.

- **Base:** `main` **`136713b`** (2026-11-05), con E4.9 integrado en `0176ffc` y E4.5 en
  `a806fd9`.
- **Autorización:** análisis y preparación documental de E4.10 solicitados por el usuario
  el 2026-11-05, en paralelo con DT7/#218.
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
- Worktree independiente: `docs/e410-preparation`, base `136713b`.
- Sin ediciones concurrentes: el subagente fue read-only; la consolidación la hace el
  coordinador.

## 1. Diagnóstico de vigencia de SPEC28

| Supuesto en SPEC28 | Estado real | Corrección documental |
| --- | --- | --- |
| E4.9 se lee en PR #200 OPEN/draft, head `2fe5d01`, sin QA ni merge | E4.9 **MERGED** en `0176ffc`; QA **APTO CON RESERVAS**; CI post-merge `42000330143` PASS; `a806fd9` es E4.5 (#216), no E4.9 | Actualizar cabecera y referencias; no confundir ambos SHA |
| Los AC de E4.9 siguen todos `UNRUN` sin matices | El testplan E4.9 registra PASS de fixtures/parciales; no hay PASS de aceptación ni cierre real | Distinguir PASS de fixture/parcial de PASS de aceptación |
| E4.9 solo implementa v1; no hay re-cierre; estado solo `Cerrado`; auditoría solo dos acciones, marcado como provisional | Es el contrato **implementado y mergeado**: `confirmCierre` fija `version=1`, `ALREADY_CLOSED` remite a E4.10; estado persistido `Cerrado`; auditoría limitada | Convertir en `[CONFIRMADO: E4.9]`; dejar pendiente solo la extensión de E4.10 |
| No se asume versión de esquema nueva; se decide tras E4.9 | v25 está ocupada por E4.9; E4.10 no reserva versión | Declarar «v25 ocupada; E4.10 sin versión en SPEC28» |
| Endpoints/formas/versiones provisionales de E4.9 | La superficie E4.9 existe y está mergeada; las rutas de E4.10 no están fijadas | Separar superficie E4.9 observada de rutas E4.10 pendientes |
| T1 incluirá Ventas si E4.9 confirma su ampliación | T1 de E4.9 ya incluye Ventas E4.2 (alta, rectificación, anulación, cambio de fecha) | Contrato heredado confirmado |
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
| T1/T2/T3 base | `[CONFIRMADO]` T1 bloquea (incluye Movimientos, Compras y Ventas), T2 audita, T3 permite | Dentro de la ventana, el alcance T1 depende de D2 |
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
| **D1** Último cierre y reserva | Definición `[CONFIRMADO]`; reserva/v3 usuario | **A**: el reabierto reserva la posición hasta re-cierre o cancelación; una sola ventana; v3+ solo sobre la última versión y secuencial | B multiplica ventanas/versiones; C añade bloqueo y trabajo programado | Usuario | P5/DT3; SPEC27; roadmap E4.10 |
| **D2** Ventana y alcance T1 | Usuario; base T1 `[CONFIRMADO]` | **B acotada**: T1 solo en la ventana del ciclo para Movimientos, Compras y Ventas; nunca S0/`inicio`/`Fin`; auditoría por escritura; re-bloqueo al re-cerrar/cancelar | A deja sin vía la corrección T1; C añade vencimiento automático | Usuario | SPEC27 T1/T2/T3; testplan E4.9 |
| **D3** Motivo y actor | Usuario; límites/actor `[CONFIRMADO]` | **B+C**: motivo separado al reabrir y al re-cerrar; 1000 caracteres; actor de sesión; sin roles nuevos | A pierde el motivo de la corrección; C no distingue personas | Usuario | SPEC27 auditoría; E4.10-AC2 |
| **D4-E4.10** Revalidación | No modificar S0 `[CONFIRMADO]`; matriz/nivel usuario; agregados dependen de E4.11 | **A** para cierres posteriores + **B** para dependencias no cerradas: S0/plan siguiente, fotos, auxiliares, agregados E4.11, precontrol; contradicción bloquea; aviso solo si se declara no bloqueante | C puede dejar cadena incoherente | Usuario | E4.10-AC1/AC3; roadmap |
| **D5** Versión vigente y agregados | Depende de E4.11 + usuario | **A alineada con P4-A**: v1 visible etiquetada; agregados nuevos excluyen el ciclo reabierto y lo marcan `PendienteReCierre`; agregados ya generados congelados sin recálculo | B muestra total que puede no coincidir; C exige nueva versión de agregado | Usuario + E4.11 | DT4; SPEC27; SPEC29 P1/P4/P5 |
| **D6** Plan y auxiliares | Usuario; P1/AC-17 `[CONFIRMADO]` | **A+C**: plan vivo editable; `SinPlan`↔`Capturado` con motivo; v2 repite el contrato completo y guarda comparación con v1; auxiliares desde fuentes vigentes; fuente ausente `No disponible` | B impide rectificar plan; cambios silenciosos sin comparación | Usuario | P1; SPEC27 foto; E4.10-AC19 |
| **D7** Idempotencia y concurrencia | Patrón `[CONFIRMADO]`; comportamiento observable usuario | **A+B+C**: claves separadas reapertura/re-cierre; versión/estado esperado; transacción inmediata; reintento idéntico seguro; payload distinto/versión obsoleta → conflicto; nunca dos versiones | B solo no resuelve dos pestañas; C solo no cubre reintentos | Usuario | E4.9 AC-10/11; testplan |
| **D8** Fallo/cancelación/recuperación | Usuario | **A+B**: reapertura y re-cierre atómicos e independientes; fallo del re-cierre deja `Reabierto(vN)` y v1 consultable; cancelación auditada sin foto; **C descartada** | Quedarse reabierto bloquea si D1 no prevé salida; B añade transición | Usuario | SPEC28; análisis E4.10 |
| **D9** Ciclos antiguos/DT9 | `[CONFIRMADO]`; solo confirmar | **A**: E4.10 solo último cierre; DT9 fuera, con SPEC propia | B rompe P5/DT9 y multiplica impacto | Usuario | P5/DT9; roadmap |

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
| Cancelación | Vuelta a `Cerrado(vN)` sin foto | `[PENDIENTE D8-B]` |

### 4.2 Transiciones

- `Cerrado(vN) → Reabierto(vN)`: `[PROPUESTA]`, auditada, sin foto.
- `Reabierto(vN) → Cerrado(vN+1)`: `[CONFIRMADO]` en «versión nueva sin alterar v1»;
  `[PROPUESTA]` en operación y secuencia.
- `Reabierto(vN) → Cerrado(vN)` por cancelación: `[PENDIENTE D8-B]`.
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
| T1 | `[CONFIRMADO]` 409 `HISTORY_LOCKED` por fecha para Movimientos/Compras/Ventas; S0 e `Inicio`/`Fin` por ciclo cerrado | `[PENDIENTE D2]`: A lo mantiene bloqueado; B permite solo dentro del ciclo y ventana, con auditoría; S0/`inicio`/`Fin` siempre bloqueados |
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

- Cabecera/base: E4.9 mergeado `0176ffc`, QA APTO CON RESERVAS, CI/E2E; `main` `136713b`;
  aclarar que `a806fd9` es E4.5.
- Convertir solo los marcadores que describen la superficie E4.9 ya integrada (v1,
  triggers, acciones `cierre`/`cierre_fuera_de_orden`, endpoints E4.9); mantener
  `[PENDIENTE]` los que dependen de D1/D5/D8, de la forma de reapertura y de la versión de
  esquema.
- Confirmar que E4.9 no implementa re-cierre, `version=1` y estado persistido `Cerrado`.
- Añadir T1 Ventas como contrato heredado.
- Actualizar E4.11/E4.12: DRAFT en `main`, sin aprobación ni DEV.
- Mantener D1–D8 abiertas y D9 pendiente de confirmación explícita; todos los AC E4.10
  `UNRUN`; no convertir PASS de fixtures E4.9 en PASS de aceptación.
- Actualizar el testplan: retirar «PR #200 OPEN/draft» y conservar regresiones E4.9.

### 8.2 Paquetes de decisión

1. **Integridad de la ventana:** D2 + D1 + D8 + confirmación D9.
2. **Auditoría y concurrencia:** D3 + D7.
3. **Dependencias:** D4 + D6.
4. **Fotos y periodos:** D5 + E4.11 P1/P4/P5 (conjunto).
5. **Límite:** D9 (confirmación; puede ir con el paquete 1).

### 8.3 Secuencia recomendada

1. `E4.10-DOC-01`: actualizar SPEC28 y testplan, solo vigencia E4.9 y marcadores
   obsoletos; sin tocar D1–D9 ni declarar PASS.
2. Paquete 1 (D2/D1/D8/D9); después paquete 2 (D3/D7) y paquete 3 (D4/D6).
3. Paquete conjunto E4.10/E4.11 (D5 + P1/P4/P5).
4. Revisión independiente y aprobación de SPEC28.
5. Paquete DEV de E4.10: gate separado, no autorizado.
6. E4.11 avanza tras D5; E4.12 sigue bloqueado, entre otros, por DT6/DT7, E4.5, E4.7,
   E3.5/E3.6 (AC-15 PARCIAL), AUD-06 y E4.10/E4.11; el roadmap exige E1–E3 y E4.1–E4.11.

**Siguiente acción única:** abrir `E4.10-DOC-01` con ownership de `specs/28-*` para
actualizar la vigencia E4.9 y retirar marcadores provisionales obsoletos, manteniendo
D1–D9 y los AC E4.10 abiertos/`UNRUN`.

## 9. Evidencia y límites

- **Comprobaciones:** `git rev-parse` en `main` `136713b`; lectura de SPEC28, brainstorming,
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
