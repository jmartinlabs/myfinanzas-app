# E4.10 — paquete definitivo de autorización DEV (2026-11-05)

> **PROPUESTA — NO AUTORIZADA.** Este paquete fija alcance, decisiones técnicas, secuencia,
> pruebas y criterios de aceptación para una autorización **separada** de DEV E4.10. **No
> autoriza desarrollo**, no escribe código ni DDL, no migra datos, no declara ningún AC en
> PASS y no habilita datos reales, cierre real ni despliegue. La ejecución exige aprobación
> humana expresa sobre un SHA concreto.

- **Base:** `main` **`2cd0951`** (2026-11-05).
- **SPEC28:** ratificada como contrato documental el 2026-11-05 (D1–D9 y `SIN_CAMBIOS`).
- **Testplan:** 24 AC (`E4.10-AC01…AC24`), todos **`UNRUN`**.
- **Esquema vigente:** **v25** (E4.9 integrado en `0176ffc`).
- **Propuesta previa:** [e410-dev-package-proposal-2026-11-05](e410-dev-package-proposal-2026-11-05.md);
  este documento la sustituye como paquete de autorización.
- **Fuera de alcance:** DT9, recuperación extraordinaria, E4.11, datos reales y cierre real.

---

## 1. Alcance congelado

Se conserva íntegramente el alcance de SPEC28; no se amplía ni se reduce por inferencia.

### Incluido

- Reapertura del último cierre con motivo, actor, UTC, versión/estado esperado, idempotencia
  y una sola ventana activa (D1-A, D3-B+C, D7).
- Correcciones T1/T2/T3 dentro de la ventana y del ciclo, con impacto y auditoría (D2-B).
- Revalidación de solo lectura de S0, planes, fotos, auxiliares, agregados y precontrol (D4).
- Re-cierre con foto completa `vN+1`, comparación con `vN` y vínculo consultable (D1-A, D6).
- Cancelación sin foto solo con ausencia de cambios materiales acreditada (D8).
- Consulta de todas las versiones; `vN` no vigente sin advertencia (D5-A).
- Estados vacío, carga, error, bloqueo y sesión expirada (SPEC28 §13).

### Excluido

- DT9 y rectificación excepcional de ciclos antiguos.
- Recuperación extraordinaria cuando existe cierre posterior.
- Recalcular fotos, agregados o precontrol desde el estado vivo.
- Agregados E4.11 y composición trimestral/anual (SPEC29 P2/P3/P6/P7/P8).
- Roles, permisos, autenticación, temas o UI cerrada.
- Datos reales, cierre real y migración en producción.

---

## 2. Versión de esquema: verificación y propuesta

**Verificado en `main` `2cd0951`:**

| Comprobación | Evidencia |
| --- | --- |
| Versión vigente | `apps/api/src/database-identity.ts:4` → `schemaVersion = 25` |
| Última rama de migración | `apps/api/src/database-schema.ts:139` → `if (versions[0].version < 25) cierreFinancieroSchema(db)`; no existe rama `<26` |
| Lista admitida en backup | `apps/api/src/backup.ts:54` y `:275` terminan en `25` |
| Contrato más reciente | `apps/api/src/schema-contracts.json:14103` → `C25-E49-CIERRE-FINANCIERO` |
| Ninguna DDL escribe 26 | `grep` sin resultados de `SET version=26` |
| 26 solo como centinela de «desconocido» | `e49-schema-contract.test.ts:212-217`, `e43-schema-contract.test.ts:189-194` |

**Propuesta expresa: reservar `v26` para E4.10**, migración aditiva `25 → 26`.

Actualizaciones obligatorias al introducir v26:

- `database-identity.schemaVersion`, rama `<26` en `database-schema` y contrato `C26`.
- Listas admitidas de `backup.ts` y tabla de objetos del manifiesto (`schema >= 26`).
- Tests que hoy usan 26 como versión desconocida: deben pasar a un centinela superior (p. ej.
  27) sin debilitar la comprobación de rechazo.
- `schema-contracts.json`, pruebas de contrato y restauración v26.

**Riesgo:** una versión no reservada o un centinela sin actualizar rompería backup/restore y
las pruebas de contrato. **Decisión humana:** confirmar la reserva de v26.

---

## 3. Matriz DT-A…DT-I

Cada decisión indica alternativas, recomendación, riesgos y si requiere aprobación humana o
es implementativa una vez aprobada la anterior.

### DT-A · Persistencia de la reapertura

| | |
| --- | --- |
| **Alternativas** | A1: `UPDATE` de `cierres` con estado reabierto. A2: tabla append-only `reaperturas` + proyección singleton `reapertura_activa(id=1)` para concurrencia. A3: tabla de ventanas con estado mutable. |
| **Recomendación** | **A2.** Los eventos son la fuente de verdad inmutable; la proyección singleton solo serializa una única ventana global y se reconstruye desde eventos. |
| **Justificación** | `cierres` y `fotos_cierre` son inmutables y tienen triggers; A1 está prohibida por SPEC28 §4/§6. A3 mezcla auditoría con estado mutable. A2 no reescribe E4.9 y hace explícita la regla «una sola reapertura activa» de D1-A. |
| **Riesgos** | Evento y proyección deben escribirse en la misma transacción; si divergen, hay que detectarlo al arrancar y reconstruir. Un fallo entre ambos no debe dejar la ventana abierta sin evento. |
| **Dependencias** | DT-B (auditoría), DT-D (estado), DT-F (v26). |
| **Tipo** | **Aprobación humana** (modelo de persistencia). |

Campos mínimos de `reaperturas`: `id`, `ciclo`, `version_origen`, `tipo`
(`reapertura`/`cancelacion`), `actor`, `utc`, `motivo`, `fingerprint_peticion`,
`version_esperada`, `clave_intento`, `correlacion`, `reapertura_origen` (para cancelación) y
`resultado`. Triggers de no `UPDATE`/`DELETE`.

### DT-B · Auditoría

| | |
| --- | --- |
| **Alternativas** | B1: reconstruir `cierre_audit` para ampliar el `CHECK` de acciones. B2: nueva tabla append-only `reaperturas` como registro de reapertura/cancelación, dejando `cierre_audit` intacta. B3: doble escritura en ambas. |
| **Recomendación** | **B2.** `cierre_audit` conserva cierres; `reaperturas` registra reapertura/cancelación; el re-cierre usa `cierre_audit` con `accion='cierre'`. Una vista de historial une ambas fuentes por ciclo/versión. |
| **Justificación** | Reconstruir una tabla de auditoría financiera (12 pasos en SQLite) añade riesgo sin beneficio funcional. La doble escritura puede divergir. B2 mantiene inmutables las filas existentes y no cambia IDs. |
| **Riesgos** | Cadena repartida en dos tablas; exige correlación explícita y una consulta única. Un re-cierre sin evento de reapertura previo debe rechazarse. |
| **Dependencias** | DT-A, DT-D, AC18. |
| **Tipo** | **Aprobación humana** (estrategia de auditoría). |

### DT-C · Fingerprint de `v2`

| | |
| --- | --- |
| **Alternativas** | C1: igual que E4.9 (`payload` + `coherencia`), sin origen. C2: `payload` + `coherencia` + origen `{ciclo, versionOrigen}`. C3: incluir también motivo, actor y revalidación. |
| **Recomendación** | **C2.** La huella cubre contenido y coherencia, y ata la foto a su versión de origen. Motivo y actor quedan como metadatos inmutables; la revalidación ya entra por `coherencia`. |
| **Justificación** | El motivo se captura al confirmar, después del preflight: no puede formar parte de la huella de la vista previa. Incluir actor/motivo haría que el mismo contenido tuviera huellas distintas y rompería la comparación `vN`/`vN+1`. La integridad del motivo depende de la auditoría append-only y del vínculo. |
| **Riesgos** | Si el origen no entra en la huella, una foto podría asociarse a otra versión; C2 lo impide. Si la revalidación cambia entre preview y confirm, `coherencia` fuerza `REVISION_CONFLICT`. |
| **Dependencias** | DT-A (vínculo), DT-D, AC02/AC10. |
| **Tipo** | **Aprobación humana** (semántica del contrato); el orden exacto de serialización es implementativo. |

### DT-D · Estado observable y concurrencia

| | |
| --- | --- |
| **Alternativas** | D1: persistir `estado` en `cierres` (rechazada). D2: derivar `Cerrado(vN)`/`Reabierto(vN)` de eventos + última versión, con proyección singleton. D3: persistir solo el estado sin historial (rechazada). |
| **Recomendación** | **D2.** Estado derivado; la proyección `reapertura_activa(id=1)` garantiza una sola ventana global y se reconstruye desde eventos. |
| **Justificación** | Evita mutar el cierre y mantiene la historia completa. La unicidad global se impone con la fila singleton dentro de la transacción; una ventana por ciclo no bastaría para D1-A. |
| **Riesgos** | Lecturas inconsistentes si la proyección se consulta fuera de transacción; concurrencia entre reapertura, cancelación y re-cierre. Pruebas de dos operaciones simultáneas y de versión obsoleta. |
| **Dependencias** | DT-A, DT-B. |
| **Tipo** | **Implementativo** una vez aprobados A y B; el contrato del estado se valida con AC06/AC12/AC16. |

### DT-E · Superficie API

| | |
| --- | --- |
| **Alternativas** | E1: reutilizar `/preflight` y `/cerrar` y añadir rutas de reapertura. E2: recurso REST `/reaperturas`. E3: acciones RPC. |
| **Recomendación** | **E1**, coherente con E4.9: `POST /api/cierres/:ciclo/reabrir`, `POST /api/cierres/:ciclo/reapertura/cancelar`, `GET /api/cierres/:ciclo/reapertura`; `/estado` incluye el bloque de reapertura; `/preflight` y `/cerrar` aceptan `versionEsperada`; `/foto?version=N` no cambia. Clave `Idempotency-Key` obligatoria en escrituras. |
| **Justificación** | Menor superficie nueva, reutiliza preflight, foto y errores motivados; evita duplicar el contrato de cierre. |
| **Riesgos** | Ambigüedad entre cierre inicial y re-cierre; se resuelve por la ventana activa y `versionEsperada`. Códigos nuevos deben documentarse sin romper E4.9. |
| **Códigos propuestos** | `NO_ES_ULTIMO_CIERRE`, `YA_REABIERTO`, `NO_REABIERTO`, `VERSION_CONFLICTO`, `IDEMPOTENCY_CONFLICT`, `SIN_CAMBIOS`, `IMPACTO_NO_VERIFICABLE`, `DT6_BLOQUEADO`, `E35_BLOQUEADO`, `DT9_FUERA_DE_ALCANCE`. |
| **Dependencias** | DT-A/B/D, contrato E4.9. |
| **Tipo** | **Aprobación humana** (contrato de API); los DTO exactos son implementativos tras aprobar rutas y códigos. |

### DT-F · Versión de esquema y migración

| | |
| --- | --- |
| **Alternativas** | F1: reservar v26 (recomendada). F2: posponer la migración (inviable para DEV). F3: usar v27 si v26 se ocupara (no ocurre hoy). |
| **Recomendación** | **F1: v26**, migración aditiva `25 → 26` con `CREATE TABLE`/triggers/índices y sin tocar filas existentes. |
| **Justificación** | Verificación de §2: 26 no está asignada; solo aparece como centinela de versión desconocida. Una sola migración por versión mantiene el patrón E4.3/E4.9. |
| **Riesgos** | Backup/restore, listas de versiones y contratos sin actualizar; centinelas que dejan de probar el rechazo; downgrade no soportado. |
| **Dependencias** | DT-A/B, backup, `schema-contracts.json`, `database-identity`. |
| **Tipo** | **Aprobación humana** de la reserva; ejecución implementativa con contrato y pruebas. |

### DT-G · Frontera T1/T2/T3 en código

| | |
| --- | --- |
| **Alternativas** | G1: extender las guardas de E4.9 con una excepción limitada a la ventana activa del ciclo reabierto. G2: guardas paralelas para E4.10. |
| **Recomendación** | **G1.** `closedWindows` excluye solo el ciclo con reapertura activa; `movementClosureImpact` omite únicamente las fotos de ese ciclo; S0, `inicio`, `Fin` y cualquier otro ciclo siguen bloqueados; fuera de la ventana se mantiene `HISTORY_LOCKED`. T2/T3 no cambian. |
| **Justificación** | Una segunda implementación duplicaría la regla T1 y podría divergir. La excepción debe ser mínima y fail-closed. |
| **Riesgos** | Una exclusión demasiado amplia abriría ciclos cerrados. Pruebas obligatorias: reabrir A y verificar que B sigue bloqueado; intentar S0/ventana/Fin; fechas fuera de ventana; estado cancelado. |
| **Dependencias** | DT-A/D, SPEC28 §8, E4.9 guards. |
| **Tipo** | **Implementativo** con matriz de guardas confirmada por QA; D2-B ya está aprobada. |

### DT-H · Detección de cambios materiales (D8)

| | |
| --- | --- |
| **Alternativas** | H1: comparar solo importes/totales (rechazada por SPEC28). H2: comparar todos los bloques capturados y tratar la incertidumbre como cambio material. |
| **Recomendación** | **H2.** Cancelar sin foto solo si no hubo escrituras desde la reapertura y `vN` sigue siendo equivalente en hechos, relaciones, clasificación, plan y componentes. Cualquier escritura, bloque ausente o evidencia insuficiente impide la cancelación y obliga a `vN+1` o a la vía extraordinaria. |
| **Justificación** | SPEC28 rechaza la igualdad de importes como prueba. La comparación por bloques de la foto es la única evidencia disponible y es reproducible. |
| **Riesgos** | Un falso «sin cambios» perdería correcciones; un falso «cambios» solo fuerza una foto nueva (coste aceptable). Ante duda, bloquear. |
| **Dependencias** | D6/D8, payload de foto, AC21/AC24. |
| **Tipo** | **Aprobación humana** del conjunto de comparación; implementación reproducible con pruebas. |

### DT-I · Recuperación extraordinaria

| | |
| --- | --- |
| **Alternativas** | I1: no implementar ruta; bloquear y remitir a un proceso separado. I2: implementarla dentro de E4.10. |
| **Recomendación** | **I1.** E4.10 solo bloquea el re-cierre ordinario y registra el motivo; la recuperación extraordinaria exige SPEC y autorización propias. |
| **Justificación** | Es la frontera de DT9 y del alcance aprobado; I2 ampliaría SPEC28 de facto. |
| **Riesgos** | Presión operativa para usarla como ruta ordinaria; debe quedar explícita en mensajes y documentación. |
| **Dependencias** | AC16/AC21, DT9. |
| **Tipo** | **Confirmación humana** de exclusión; sin implementación. |

---

## 4. Dependencias y bloqueos reales

| Elemento | Estado | Efecto en DEV/aceptación |
| --- | --- | --- |
| E4.9 cierre y foto v1 | Integrado `0176ffc`, v25 | Base de foto, auditoría, idempotencia y preflight |
| Esquema v26 | **Propuesto** | Bloquea DDL hasta aprobación de DT-F |
| DT6/T-BKP | Abierto | Bloquea cierre/re-cierre **real**; no la aceptación con fixtures |
| E3.5/FIN_NETA AC-15 | PARCIAL | Sin verificación suficiente no hay re-cierre real ni foto |
| E4.5 precontrol | SPEC aprobada; DEV no autorizado; 59 AC `UNRUN` | **Decisión abierta:** si no está implementado, el paquete no asume que su ausencia bloquee o se registre `No disponible`; requiere criterio humano |
| SPEC29 P2/P3/P6/P7/P8 | Pendientes | Fuera de E4.10; no se infieren |
| Sesión MFA | Vigente | Escrituras con sesión completa y CSRF/Origin |

---

## 5. Secuencia de implementación

| # | Incremento | Entregable | Gate de salida |
| --- | --- | --- | --- |
| I0 | Decisiones | DT-A…DT-I aprobadas o diferidas explícitamente | Autorización humana del paquete |
| I1 | Esquema v26 | Migración aditiva, `reaperturas`, proyección, triggers, contrato `C26`, backup/restore | Upgrade 25→26 y restore verificados; sin cambios en filas existentes |
| I2 | Reapertura | Evento, motivo/actor/UTC, versión esperada, una ventana, idempotencia | AC01, AC04–AC07, AC14, AC22 |
| I3 | Guardas y revalidación | T1/T2/T3 en ventana, impacto, revalidación de solo lectura | AC08, AC09, AC17 |
| I4 | Re-cierre | Foto completa `vN+1`, fingerprint C2, vínculo, preflight/DT6, `SIN_CAMBIOS` | AC02, AC10, AC13, AC15, AC19, AC20, AC23, AC24 |
| I5 | Cancelación | D8 sin foto solo sin cambios acreditados; con cambios `vN+1`; con cierre posterior, bloqueo | AC16, AC21 |
| I6 | Idempotencia y concurrencia | Claves separadas, conflicto de payload, carreras y versión obsoleta | AC11, AC12, AC18 |
| I7 | Contrato y UI | `/estado`, reapertura, versiones, estados §13, accesibilidad | AC06, AC20 y matriz visual |
| I8 | Regresión y QA | E4.9, seguridad, backup/restore, límites y sesión | QA independiente APTO |

Cada incremento se publica con su propio commit/PR y no se fusiona sin autorización.

---

## 6. Pruebas AC01–AC24

| AC | Incremento | Método | Evidencia mínima |
| --- | --- | --- | --- |
| AC01 | I2 | Bun Test + SQL snapshot | Error motivado; cierre posterior intacto |
| AC02 | I4 | Bun Test + snapshot | v1, v2, vínculo y metadatos |
| AC03 | I3 | Bun Test de revalidación | DTO y snapshot sin cambios ajenos |
| AC04 | I2 | Bun Test de elegibilidad | `NO_ES_ULTIMO_CIERRE`; DT9 no habilitado |
| AC05 | I2 | Fallo inducido | Rollback total; sin evento huérfano |
| AC06 | I2/I7 | Bun Test + SQL | `Reabierto(vN)`, motivos 1000/trim, actor/UTC |
| AC07 | I2 | Bun Test + triggers | v1/foto intactas; `PATCH`/`DELETE` rechazados |
| AC08 | I3 | Bun Test + UI futura | Impacto/motivo/auditoría; v1 intacta |
| AC09 | I3 | Bun Test de guarda | Dentro permitido; S0/ventana/Fin y fuera bloqueados |
| AC10 | I4 | Bun Test + SQL snapshot | Una `vN+1`, anteriores intactas |
| AC11 | I6 | Bun Test de idempotencia | Replay idéntico; conflicto de payload |
| AC12 | I6 | Bun Test de concurrencia | Una gana; sin doble ventana/versión |
| AC13 | I4 | Fallo inducido | Rollback; sigue `Reabierto(vN)` |
| AC14 | I2 | Rutas/guardas | Rechazo en todos los saltos |
| AC15 | I4 | Preflight | Bloqueo sin DT6/E3.5; fixture sintético |
| AC16 | I5 | Carrera | Bloqueo con cierre posterior; sin v2 silenciosa |
| AC17 | I3 | Revalidación | Contradicción bloquea; valores auditados |
| AC18 | I6 | Bun Test + SQL | Cadena append-only sin huecos |
| AC19 | I4 | Bun Test + UI futura | Foto completa y auxiliares vigentes |
| AC20 | I4/I7 | Contrato | Versiones persistidas; sin recálculo |
| AC21 | I5 | Bun Test + SQL | Cancelación solo sin cambios; estados correctos |
| AC22 | I2 | Límites | Rechazo de ciclo antiguo/restore |
| AC23 | I4 | Secuencia | v3+ secuencial; una ventana |
| AC24 | I4 | Bun Test + SQL | `SIN_CAMBIOS`; sin foto; sin cancelación automática |

**Regresión E4.9:** cierre, foto v1, T1/T2/T3, idempotencia, preflight, backup y triggers deben
seguir en PASS. Cualquier cambio de contrato de E4.9 exige justificación y QA específica.

---

## 7. QA y criterios de aceptación

1. **QA independiente** sobre el SHA autorizado, con evidencia por AC y sin auto-QA del
   ejecutor.
2. **24/24 AC en PASS** o reserva explícita aprobada; ningún `UNRUN` al cerrar el DEV.
3. **Contrato v26 determinista**, upgrade 25→26 y restore verificados; sin cambios en IDs,
   auditoría, MFA ni datos históricos.
4. **Regresión E4.9** sin fallos; guardas T1/T2/T3 probadas en ambos sentidos.
5. **Seguridad:** sesión MFA, CSRF/Origin, límites de payload, ausencia de rutas de mutación
   de fotos.
6. **Sin datos reales:** fixtures sintéticos identificados; el cierre real sigue bloqueado
   por DT6 y E3.5 verificable.
7. **Merge separado** con autorización explícita; la aceptación funcional no se deduce del
   DEV ni de la QA.

---

## 8. Riesgos del paquete

- **Integridad histórica:** una exclusión incorrecta en T1 podría modificar un ciclo cerrado.
- **Inmutabilidad:** triggers y proyección deben impedir reabrir dos veces o reescribir vN.
- **Auditoría:** la cadena repartida exige correlación y vista única; sin ella, huecos.
- **Versiones:** v26 mal reservada rompe backup/restore y contratos.
- **Concurrencia:** dos reaperturas o un cierre posterior durante la ventana.
- **D8:** un falso «sin cambios» perdería correcciones; ante duda, bloquear.
- **Alcance:** la recuperación extraordinaria o E4.11 no deben colarse en el DEV.

---

## 9. Autorización futura (no concedida)

Texto candidato para una autorización separada:

> Autorizo el DEV E4.10 sobre el SHA indicado, con el alcance congelado de SPEC28, las
> decisiones DT-A…DT-I aprobadas en este paquete y la reserva de esquema v26. Autorizo código,
> DDL y migración **solo en el entorno de desarrollo**, con fixtures sintéticos, sin datos
> reales, sin cierre real, sin despliegue y sin migración en producción. La aceptación exige
> los 24 AC en PASS, regresión E4.9, QA independiente y merge separado. DT9, la recuperación
> extraordinaria y E4.11 quedan fuera.

**No concedida.** Sin esta autorización no se escribe código, DDL, migración ni prueba alguna.
