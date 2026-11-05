# E4.10 — paquete definitivo de autorización DEV (2026-11-05)

> **PROPUESTA — NO AUTORIZADA.** Este paquete fija alcance, decisiones técnicas, secuencia,
> pruebas y criterios de aceptación para una autorización **separada** de DEV E4.10. **No
> autoriza desarrollo**, no escribe código ni DDL, no migra datos, no declara ningún AC en
> PASS y no habilita datos reales, cierre real ni despliegue. La ejecución exige aprobación
> humana expresa sobre un SHA concreto.

- **Base original:** `main` **`2cd0951`**; **reverificado en `a8e526b`** (2026-11-05).
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
  y una sola ventana activa (D1-A, D3-B+C, D7); `v3+` solo secuencial sobre la última
  versión cerrada.
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

**Reverificado en `main` `a8e526b` (2026-11-05):**

| Comprobación | Evidencia |
| --- | --- |
| Versión vigente | `apps/api/src/database-identity.ts:4` → `schemaVersion = 25` |
| Última rama de migración | `apps/api/src/database-schema.ts:139` → `if (versions[0].version < 25)`; no existe rama `<26`; el constructor fresco llega a `>=25` en `:262` |
| Lista admitida en backup | `apps/api/src/backup.ts:54` y `:275` terminan en `25`; la lista de tablas por versión empieza en `:310` y la entrada v25 está en `:355` |
| Contrato más reciente | `apps/api/src/schema-contracts.json:14103` → `C25-E49-CIERRE-FINANCIERO` |
| Ninguna DDL escribe 26 | Solo tests hacen `UPDATE schema_version SET version=26`; no hay `C26` ni migración 26 |

**Propuesta expresa: reservar `v26` para E4.10**, migración aditiva `25 → 26`. No se crea
DDL ni migración en este paquete.

### 2.1 Consumidores identificados (deben actualizarse en el DEV)

1. **Identidad y migración:** `database-identity.ts:4`; ramas `database-schema.ts:139` y `:262`.
2. **Backup/restore:** listas de versiones `backup.ts:54` y `:275`; tablas del manifiesto
   desde `:355` (nuevas tablas de E4.10).
3. **Contratos:** `schema-contracts.json` (nuevo `C26`) y `schema-contract.ts`.
4. **Centinelas de versión desconocida:** `e49-schema-contract.test.ts:212-217` y `:421-442`;
   `e43-schema-contract.test.ts:189-194` y `:401`. Deben pasar a 27 sin debilitar el rechazo.
5. **Aserciones de versión vigente 25/C25:** 57 líneas (50 `version: 25` + 7 `toBe(25)`,
   incluye literales de fixture) en 29 archivos de test; revisar además las referencias
   `C25`:
   `ciclos`, `comida`, `compartidos`, `compras`, `cycle-operations`, `d5-aportaciones`,
   `d5-backup`, `deudas-v23-migration`, `deudas`, `e35-migration`, `e43-migration`,
   `e43-schema-contract`, `e44-schema-contract`, `e49-api`, `e49-migration`,
   `e49-schema-contract`, `movimientos`, `nomina`, `plan-anual`, `planes-ciclo`,
   `production`, `restore-v19-v20`, `revision-comida-backup`, `revision-comida`,
   `schema-contract-v18`, `sqlite-identity-concurrency`, `vehiculos-backup`, `vehiculos` y
   `ventas`.

**Riesgo:** una versión no reservada, una lista de backup sin actualizar o un centinela que
siga apuntando a 26 rompería restore y las pruebas de contrato. **Decisión humana:** confirmar
la reserva de v26. **Implementación:** actualizar todos los consumidores antes de migrar.

---

## 3. Matriz DT-A…DT-I

Cada decisión indica alternativas, recomendación, riesgos y si requiere aprobación humana o
es implementativa una vez aprobada la anterior. **DT-A, DT-B y DT-D se aprueban como bloque**
(modelo de persistencia, auditoría y estado); el orden de implementación es A → B → D.

### DT-A · Persistencia de la reapertura

| | |
| --- | --- |
| **Alternativas** | A1: `UPDATE` de `cierres` con estado reabierto. A2: tabla append-only `reaperturas` + proyección singleton `reapertura_activa(id=1)` para concurrencia. A3: tabla de ventanas con estado mutable. |
| **Recomendación** | **A2.** Los eventos son la fuente de verdad inmutable; la proyección singleton solo serializa una única ventana global y se reconstruye desde eventos. |
| **Justificación** | `cierres` y `fotos_cierre` son inmutables y tienen triggers; A1 está prohibida por SPEC28 §4/§6. A3 mezcla auditoría con estado mutable. A2 no reescribe E4.9 y hace explícita la regla «una sola reapertura activa» de D1-A. |
| **Riesgos** | Evento y proyección deben escribirse en la misma transacción; si divergen, hay que detectarlo al arrancar y reconstruir. Un fallo entre ambos no debe dejar la ventana abierta sin evento. |
| **Dependencias** | Bloque A/B/D (aprobación conjunta), DT-F (v26). |
| **Tipo** | **Aprobación humana** (modelo de persistencia). |

Campos mínimos de `reaperturas`: `id`, `ciclo`, `version_origen`, `tipo`
(`reapertura`/`cancelacion`), `actor`, `utc`, `motivo` (obligatorio, trim, máximo 1000),
`fingerprint_peticion`, `version_esperada`, `clave_intento`, `correlacion`,
`reapertura_origen` (para cancelación) y `resultado`. `cierre_vinculos`: `ciclo`,
`version_origen`, `version_destino`, `reapertura_id`, `correlacion`, con
`PRIMARY KEY(ciclo, version_destino)`. Ambas son **append-only**: triggers de no `UPDATE` y
no `DELETE`, FKs a `cierres`/`reaperturas` y `CHECK` de motivo. La garantía D3 no depende solo
del código.

### DT-B · Auditoría

| | |
| --- | --- |
| **Alternativas** | B1: reconstruir `cierre_audit` para ampliar el `CHECK` de acciones. B2: nueva tabla append-only `reaperturas` como registro de reapertura/cancelación, dejando `cierre_audit` intacta, y nueva `cierre_vinculos` para el vínculo `vN → vN+1`. B3: doble escritura en ambas. |
| **Recomendación** | **B2.** `cierre_audit` conserva los cierres; `reaperturas` registra reapertura/cancelación; `cierre_vinculos` registra origen, destino, reapertura y correlación. El re-cierre sigue usando `cierre_audit` con `accion='cierre'`, pero un **trigger nuevo** exige `motivo` cuando `version>1` (sin reconstruir la tabla). |
| **Justificación** | Reconstruir una tabla de auditoría financiera (12 pasos en SQLite) añade riesgo sin beneficio funcional. La doble escritura puede divergir. B2 mantiene inmutables las filas existentes, no cambia IDs y garantiza el motivo D3 del re-cierre incluso si el código lo omite. |
| **Riesgos** | Cadena repartida en tres tablas; exige correlación explícita y una vista única. Un re-cierre sin evento de reapertura ni vínculo previo debe rechazarse. El trigger debe probarse sobre v1 (sin motivo) y v2+ (con motivo). |
| **Dependencias** | Bloque A/B/D, DT-F, AC18. |
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
| **Dependencias** | Bloque A/B/D. |
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
| **Alternativas** | G1: excepción explícita y acotada en los puntos de entrada T1, manteniendo `closedWindows` intacta. G2: guardas paralelas para E4.10. |
| **Recomendación** | **G1.** No modificar `closedWindows`: alimenta S0/ventana (`assertClosedCyclesUnchanged`), T2/T3, plan y revisión de comida. Añadir una resolución de «ventana activa» que solo consulten las entradas T1: `assertDatesWritable` en su variante T1, `movementClosureImpact` (Movimientos) y `operationClosureImpact` (Compras y Ventas). Excluir **todas las versiones del ciclo con ventana activa** (`v1…vN`), porque `photoSnapshots` lee todas las fotos y una versión anterior del mismo ciclo no debe bloquear sus propias correcciones; el resto de ciclos y fotos siguen bloqueando. S0, `inicio`, `Fin` y la ventana se validan con sus guardas actuales, sin excepción. Fuera de la ventana se mantiene `HISTORY_LOCKED`; T2/T3 no cambian. |
| **Justificación** | Una segunda implementación duplicaría la regla T1 y podría divergir. La excepción debe ser mínima, cubrir las tres rutas T1 (Movimientos, Compras y Ventas) y ser fail-closed. Excluir globalmente `closedWindows` desactivaría protecciones ajenas a T1; excluir solo `vN` dejaría bloqueado el ciclo tras reabrir v2/v3. |
| **Riesgos** | Una exclusión demasiado amplia abriría ciclos cerrados. Pruebas obligatorias: reabrir A y verificar que B sigue bloqueado; S0/ventana/Fin del ciclo A siguen bloqueados; fechas fuera de ventana; estado cancelado; Compras y Ventas; **reapertura de v2/v3 con T1 permitido solo en A**; fotos de A consultables e intactas. |
| **Dependencias** | Bloque A/B/D, SPEC28 §8, guardas E4.9. |
| **Tipo** | **Implementativo** con matriz de guardas confirmada por QA; D2-B ya está aprobada. |

### DT-H · Detección de cambios materiales (D8)

| | |
| --- | --- |
| **Alternativas** | H1: comparar solo importes/totales (rechazada por SPEC28). H2: comparar un conjunto material explícito y tratar la incertidumbre como cambio material, sin exigir «ninguna escritura». |
| **Recomendación** | **H2.** Conjunto material: hechos, relaciones y atribución, clasificación/referencias, plan (`SinPlan`/`Capturado`), componentes económicos (efectivo, posiciones, inversión y auxiliares usados) y S0/ventana. Excluir metadatos volátiles (`app_version`, `schema_version`, timestamps, referencia de backup, correlación). Una escritura T3 no material (nombres, notas, evidencias, etiquetas no usadas en cálculos) **no impide** la cancelación. Cualquier cambio material, incluido uno revertido, o evidencia insuficiente, impide la cancelación automática y obliga a `vN+1` o a la vía extraordinaria. |
| **Justificación** | SPEC28 rechaza la igualdad de importes como prueba y exige acreditar ausencia de cambios materiales, no ausencia de escrituras. T3 es una escritura permitida que no altera magnitudes. Los cambios revertidos no se asumen equivalentes por su historial. Los metadatos volátiles cambiarían con la propia migración a v26 y producirían falsos negativos. |
| **Riesgos** | Un falso «sin cambios» perdería correcciones; un falso «cambios» solo fuerza una foto nueva (coste aceptable). La detección depende de que toda escritura T1/T2 quede auditada; si el historial no es completo, bloquear. |
| **Dependencias** | D6/D8, payload de foto, auditoría de escrituras, AC21/AC24. |
| **Tipo** | **Aprobación humana** del conjunto material; implementación reproducible con pruebas. |

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
| E4.5 precontrol | SPEC aprobada; DEV no autorizado; 59 AC `UNRUN` | Criterio propuesto en el [testplan E4.10](../28-e410-reapertura-testplan.md), §3: ausencia `NoDisponible` con motivo; datos ilegibles o contradicción material bloquean; diferencia no material acreditada → aviso auditado. Pendiente de ratificación |
| SPEC29 P2/P3/P6/P7/P8 | Pendientes | Fuera de E4.10; no se infieren |
| Sesión MFA | Vigente | Escrituras con sesión completa y CSRF/Origin |

---

## 5. Secuencia de implementación

| # | Incremento | Entregable | Gate de salida |
| --- | --- | --- | --- |
| I0 | Decisiones | DT-A…DT-I aprobadas o diferidas explícitamente; **testplan aprobado/congelado** y criterio E4.5 §3 ratificado | Autorización humana del paquete, del testplan y del criterio |
| I1 | Esquema v26 | Migración aditiva, `reaperturas`, `cierre_vinculos`, proyección, triggers, contrato `C26`, backup/restore | Upgrade 25→26 y restore verificados; sin cambios en filas existentes |
| I2 | Reapertura | Evento, motivo/actor/UTC, versión esperada, una ventana, idempotencia | AC01, AC04–AC07, AC14, AC22 |
| I3 | Guardas y revalidación | T1/T2/T3 en ventana (Movimientos, Compras y Ventas), impacto, revalidación de solo lectura | AC03, AC08, AC09, AC17 |
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

**Regresión obligatoria (antes de cualquier PASS de E4.10):**

- `R-E49-01` T1 fuera de la ventana E4.10 sigue `HISTORY_LOCKED`.
- `R-E49-02` T2 en ciclo cerrado mantiene impacto/motivo/auditoría y no altera la foto.
- `R-E49-03` cierre ordinario duplicado sigue bloqueado; E4.10 es la única vía de reapertura.
- `R-E49-04` reintento idéntico y conflicto de payload se mantienen.
- `R-E49-05` cambio concurrente entre preview y confirmación da conflicto sin foto parcial.
- `R-E49-06` rollback de cierre total; sin cierre ni foto huérfanos.
- `R-E49-07` foto v1 no se recalcula al consultar tras T2/T3.
- `R-E49-08` cierre fuera de orden sigue bloqueando por `INCOHERENCIA_CON_CIERRE_POSTERIOR`.
- `R-E48-01` precierre sigue en solo lectura; no crea cierre, foto, reapertura ni versión.
- `R-SEC-01` rutas financieras con sesión MFA, Origin/CSRF y límites; sin roles nuevos.

Cualquier cambio de contrato de E4.9 exige justificación y QA específica.

---

## 7. QA y criterios de aceptación

1. **QA independiente** sobre el SHA autorizado, con evidencia por AC y sin auto-QA del
   ejecutor.
2. **Testplan aprobado/congelado** antes de I1 y de cualquier incremento DEV; sus
   definiciones de AC y resultados esperados
   no se reinterpretan durante el DEV. Los 24 AC en PASS o reserva explícita aprobada; ningún
   `UNRUN` al cerrar el DEV.
3. **Contrato v26 determinista**, upgrade 25→26 y restore verificados; sin cambios en IDs,
   auditoría, MFA ni datos históricos.
4. **Regresión completa** `R-E49-01…R-E49-08`, `R-E48-01` y `R-SEC-01` sin fallos; guardas
   T1/T2/T3 probadas en ambos sentidos y para las tres rutas T1.
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
