# E4.10 — Reapertura del último cierre: reutilización de E4.9 y decisiones materiales (2026-11-04)

**Estado:** documento de preparación. **No aprueba SPEC28, no autoriza DEV y no declara
ningún AC.** Las propuestas son técnicas/funcionales y no sustituyen las decisiones del
usuario ni la revisión de Álex. Base documental: `main` `0b8aade`. Lectura de código:
PR **#200** (`feat/e49-cierre`, head `2fe5d01`), **OPEN y en draft**, no mergeado.

**Leyenda:** `[CONFIRMADO]` = regla de un documento aprobado o decisión ya registrada;
`[PROPUESTA]` = detalle técnico/funcional candidato; `[PENDIENTE]` = decisión o evidencia
externa que aún no existe. `[IMPLEMENTADO PR #200]` significa que el código existe en la
rama del PR, no que esté integrado ni validado por QA.

Fuentes principales: [roadmap E4.10](../roadmap.md#e410--reabrir-el-último-cierre-y-volver-a-cerrar),
[P5/DT9](../roadmap.md#decisiones-abiertas-y-puntos-de-autorización),
[SPEC27](../27-e49-cierre-financiero-specification.md),
[testplan E4.9](../27-e49-cierre-financiero-testplan.md),
[SPEC26](../26-e48-precierre-specification.md),
[brief E4.9](e49-decision-brief-2026-11-04.md),
[paquete de ejecución E4.9](e49-execution-package-2026-11-04.md),
`apps/api/src/e49.ts` y `apps/api/src/e49-schema.ts` (solo lectura, PR #200).

---

## 1. Contratos de E4.9 reutilizables por E4.10

E4.10 no debe inventar un segundo modelo de cierre. La reapertura tiene que apoyarse en los
contratos ya aprobados de E4.9 y, cuando el PR #200 se integre, en su persistencia. La tabla
distingue contrato aprobado, presencia en el PR #200 y lo que E4.10 todavía debe resolver.

| Contrato | Regla confirmada | Estado en PR #200 (no mergeado) | Reservado para E4.10 |
| --- | --- | --- | --- |
| **Versiones v1→v2** | `[CONFIRMADO]` Cada cierre crea **v1**; un re-cierre crea **v2 sin alterar v1**; todas las versiones son consultables (SPEC27, «DT3/DT4 — resolución» y «Photo contract»). P5 exige «fotos v1/v2 intactas» (roadmap). | `[IMPLEMENTADO PR #200]` `cierre_version_sequence` obliga a que la versión sea `MAX(version)+1`; sin embargo `confirmCierre` inserta siempre `version=1` y bloquea con `ALREADY_CLOSED`. No existe camino de re-cierre. | `[PENDIENTE]` Quién y cómo crea la v2; si el estado «reabierto» consume una versión o es un evento aparte; cómo se referencia v1 desde v2. |
| **Inmutabilidad** | `[CONFIRMADO]` Cierre y foto no se actualizan ni se borran; el re-cierre añade versión (SPEC27). | `[IMPLEMENTADO PR #200]` Triggers `cierre_no_update`, `cierre_no_delete`, `foto_cierre_no_update`, `foto_cierre_no_delete`, `cierre_audit_no_update` y `cierre_audit_no_delete`; FK diferida de `cierres` a `fotos_cierre` y trigger `foto_cierre_requires_closure` para no dejar cierre/foto a medias (`e49-schema.ts`). | `[PENDIENTE]` La reapertura **no puede** actualizar `cierres.estado` ni la foto v1: necesita tabla/evento nuevo o una versión nueva, no un `UPDATE`. |
| **Auditoría** | `[CONFIRMADO]` Actor, UTC, motivo y fingerprint forman parte de la identidad; el cierre fuera de orden exige motivo y auditoría (SPEC27, AC-20). | `[IMPLEMENTADO PR #200]` `cierre_audit` es append-only; `accion` solo admite `cierre` y `cierre_fuera_de_orden`; guarda `anterior`, `posterior` (con la coherencia comparada), `motivo`, `instante` y `actor`. | `[PENDIENTE]` Añadir acciones de reapertura/re-cierre o una tabla de eventos; CHECK actual impide reutilizar `accion` sin migración; definir cadena v1→reapertura→v2. |
| **Fingerprint** | `[CONFIRMADO]` Huella propia sobre todas las fuentes que alimentan la foto; `financeRevision` es huella técnica y **no** sustituye el fingerprint (SPEC27; brainstorming M5). | `[IMPLEMENTADO PR #200]` `fingerprint({ payload, coherencia })`; se guarda en `cierres` y `fotos_cierre`; la confirmación compara el fingerprint de la vista previa y la idempotencia usa un hash de la petición. | `[PENDIENTE]` Si el fingerprint de v2 debe incluir la identidad de v1, el motivo de reapertura y el resultado de revalidación; no fijarlo antes de QA/merge. |
| **Cierre fuera de orden** | `[CONFIRMADO]` Si hay cierres posteriores, se exige `CIERRE_FUERA_DE_ORDEN` con motivo y comprobación de coherencia al mismo corte; una diferencia no explicable bloquea con `INCOHERENCIA_CON_CIERRE_POSTERIOR` (SPEC27/AC-20; revisión de Álex 2026-10-28). | `[IMPLEMENTADO PR #200]` `coherence()` compara el bloque `inversion` de cada foto posterior (efectivo, cuentas y posiciones) contra el cálculo vivo a su `Fin`; el aviso/ bloqueo y el motivo obligatorio están en `confirmCierre`; la evidencia comparada se guarda en auditoría. | `[PENDIENTE]` La vía ordinaria E4.10 **no debería** tener cierres posteriores, pero una carrera o un cierre tardío puede crearlos; decidir si E4.10 reutiliza esta comprobación, la amplía o la sustituye. |
| **Foto inmutable** | `[CONFIRMADO]` La foto captura valores y no se recalcula desde el estado vivo; incluye ventana, S0, plan final, clasificación/referencias, inversión, auxiliares, cobertura, backup y no disponibles (SPEC27, «Photo contract»). | `[IMPLEMENTADO PR #200]` `fotos_cierre` guarda bloques JSON y metadatos; `getFotoCierre` permite pedir una versión concreta y devuelve la última si no se indica. | `[PENDIENTE]` La foto v2 debe capturar el estado rectificado sin modificar v1; decidir si v2 repite todos los bloques o solo los afectados (SPEC27 ya dice que cada cierre captura el contrato completo). |
| **T1/T2/T3** | `[CONFIRMADO]` T1 bloquea con `HISTORY_LOCKED`; T2 exige impacto, motivo y auditoría con la foto intacta; T3 se permite (SPEC27, tabla «T1/T2/T3»). | `[PARCIAL PR #200]` Existen contratos de guarda (`MovementProtection`, `ClassificationGuard`, `ImpactGuard`) y las rutas de escritura los aceptan, pero el PR no incluye una prueba extremo a extremo de T1/T2 disparada por un cierre real; `app.ts` los recibe como opciones, sin que el PR acredite el cableado por defecto. | `[PENDIENTE]` E4.10 necesita que T1/T2 estén verificados por QA E4.9 antes de abrir una ventana rectificable; en particular, si la reapertura desbloquea T1 en el ciclo. |
| **DT6/T-BKP** | `[PENDIENTE]` Sin destino externo y restauración probada no se habilita el cierre real; DT6 no equivale a reabrir (roadmap, SPEC27). | `[IMPLEMENTADO PR #200]` El preflight exige evidencia de backup verificado **y** restauración probada; con fixtures se puede simular, pero no acredita DT6. | `[PENDIENTE]` La reapertura nunca debe implementarse como restauración de backup; el gate DT6 sigue siendo independiente y bloquea el cierre real. |

### 1.1 Lo que E4.9 deja utilizable sin cambios

- El **proveedor único de estado** (`getCierreEstado`) y el preflight (`previewCierre`) ya
  separan estado, versión, ventana y bloqueos; E4.10 puede consumirlos en lectura.
- El **modelo de foto por bloques** y la selección por versión (`getFotoCierre`) sirven para
  consultar v1 y v2 sin recalcular.
- La **transacción única** de cierre (cierre + foto + auditoría + intento) es el patrón que
  E4.10 debe replicar para la reapertura y el re-cierre.
- El **fingerprint de preflight** y la idempotencia por clave son reutilizables para el
  re-cierre, pero su forma exacta depende de QA/merge (ver §2).

### 1.2 Lo que E4.9 todavía no acredita

- El PR #200 está **OPEN, draft y sin decisión de revisión registrada**; no consta QA final
  ni merge. Sus nombres de
  ruta y su forma de auditoría no son contrato estable.
- Solo existe el camino de **v1**. No hay endpoint, estado ni auditoría de reapertura.
- El `estado` persistido solo admite `Cerrado`; no hay estado «reabierto» ni «pendiente de
  re-cierre».
- T1/T2/T3 están especificados y tienen puntos de extensión, pero el PR no demuestra el
  flujo completo de impacto/auditoría posterior al cierre.

---

## 2. Qué no se puede fijar todavía (depende de QA/merge de E4.9)

| Elemento | Por qué no se puede fijar | Qué falta |
| --- | --- | --- |
| **Nombres de endpoints** | SPEC27 enumera `GET /api/cierres/precierre/:ciclo`, `GET /api/cierres/:ciclo/estado`, `GET /api/cierres/:ciclo/foto` y `POST /api/cierres/:ciclo/cerrar`. El PR #200 expone además `GET /api/cierres/:ciclo/preflight` y `GET /api/cierres/:ciclo/cierre`, y usa `/estado` para el estado de precierre con un bloque `cierre` añadido. La ruta canónica de estado de cierre no está cerrada. | QA/merge de E4.9 y decisión documental sobre la ruta canónica; E4.10 no debe congelar `/reabrir` ni `/cerrar` antes. |
| **Forma exacta de la reapertura** | No está decidido si la reapertura es un `POST` con clave de idempotencia, un evento, una versión nueva o un cambio de estado; tampoco su respuesta (DTO de estado, versión esperada, foto vigente). | SPEC28 y decisiones de §3; evidencia de QA sobre idempotencia y concurrencia de E4.9. |
| **Campos de auditoría** | `cierre_audit` solo admite `cierre` y `cierre_fuera_de_orden`; no hay campo de vínculo v1→v2 ni acción de reapertura. Añadir acciones exige migración y decisión de esquema. | QA E4.9 + decisión de modelo de eventos; no asumir que se reutiliza la tabla tal cual. |
| **Política de versiones** | SPEC27 confirma v1/v2 y retención, pero no define si el estado «reabierto» cuenta como versión, si la v2 es obligatoria para volver a `Cerrado`, ni cómo se selecciona la versión «vigente» mientras el ciclo está reabierto. | Decisión del usuario (DT9/§3) y contrato de E4.11 para agregados. |
| **Desbloqueo T1 durante la reapertura** | SPEC27 no dice si reabrir vuelve editables los Movimientos del ciclo; E4.10-AC1/AC3 solo hablan de rechazar reaperturas no ordinarias y revalidar dependencias. | Decisión material del usuario; ver §3, D2. |
| **Alcance de la revalidación posterior** | AC-20 compara solo magnitudes de inversión inmunes a T2; E4.10-AC3 exige «revalidar dependencias posteriores sin modificar automáticamente su saldo inicial», pero no enumera qué dependencias ni qué hacer si fallan. | SPEC28 + matriz de impacto DT5; no ampliar AC-20 por inferencia. |
| **Evidencia de QA real** | El testplan E4.9 sigue en AC **UNRUN** y no consta QA final ni merge del PR #200; no se puede citar PASS. | QA independiente y merge; DT6 real sigue abierto para cierre real. |

**Regla de trabajo:** hasta que E4.9 esté integrado y QA haya fijado rutas, estado y
auditoría, cualquier SPEC28 debe tratar esos puntos como `[PENDIENTE]`, no como contrato
heredado.

---

## 3. Brainstorming de decisiones materiales (DT9)

DT9 cubre la **rectificación excepcional de ciclos antiguos** y su efecto en fotografías
trimestrales/anuales y cierres posteriores; no se habilita hasta otra especificación
aprobada. E4.10 es la **vía ordinaria del último cierre** (P5). Las decisiones siguientes
separan ambas cosas y no presuponen una respuesta.

### D1 — Alcance: qué significa «último cierre» y qué pasa al reabrirlo

`[CONFIRMADO]` Solo el cierre con el `Fin` cronológicamente más reciente y sin otro ciclo
posterior cerrado es reabrible; un cierre tardío de un ciclo anterior no habilita su
reapertura ordinaria (SPEC27, DT3; roadmap P5/E4.10-AC1). La fecha de registro es solo
auditoría.

`[PENDIENTE]` Caso límite: si el último cierre se reabre y queda **sin v2**, ¿sigue ocupando
la posición de «último»? Si deja de contar como cerrado, un cierre anterior podría pasar a
ser «el último» y abrirse también, con dos rectificaciones simultáneas.

| Opción | Impacto | Decisión del usuario |
| --- | --- | --- |
| A. El ciclo reabierto **reserva** la posición de último hasta que se re-cierre o se cancele explícitamente. | Evita dos reaperturas y versiones ambiguas; puede bloquear la operación si la rectificación se abandona. | Confirmar que «reabierto» sigue bloqueando reaperturas anteriores. |
| B. Un ciclo reabierto deja de ser «último»; el anterior pasa a serlo. | Permite varias rectificaciones, pero multiplica versiones y hace ambiguo qué foto es la vigente. | Solo si se acepta un modelo de múltiples ventanas abiertas, hoy no previsto. |
| C. La reapertura exige un compromiso de re-cierre (ventana o cancelación) y no se permite abandonarla. | Reduce el hueco, pero añade estado y posible bloqueo operativo. | Decidir si existe cancelación y cómo se audita. |

### D2 — Ventana de rectificación y alcance de T1

Es la decisión con más impacto en integridad histórica. El roadmap dice «rectificar por la
vía ordinaria el último ciclo cerrado» y «generar otra foto», pero no detalla si se pueden
editar los hechos ya capturados.

| Opción | Impacto | Decisión del usuario |
| --- | --- | --- |
| A. Reabrir **solo** habilita correcciones T2 (clasificación, referencias, reparto, plan vivo, auxiliares) y no desbloquea T1. | Menor riesgo: no se reescriben Movimientos ni compras cerradas; puede no servir para corregir un hecho mal capturado. | Confirmar si la rectificación ordinaria incluye hechos T1. |
| B. Reabrir desbloquea T1 **solo** en la ventana del ciclo y solo hasta el re-cierre/cancelación. | Permite corregir Movimientos/Compras; exige guardas estrictas, auditoría de cada escritura y bloqueo de otras ventanas. | Decidir alcance T1 exacto y si hay límite temporal. |
| C. Desbloqueo T1 con **ventana temporal** (p. ej. horas/días) y re-cierre o re-bloqueo automático. | Acota el hueco, pero introduce trabajo programado y riesgo de rectificación a medias. | Decidir duración y qué ocurre al vencer. |

`[PENDIENTE]` Ninguna opción debe implementarse sin definir: qué escrituras exactas se
permiten, qué revisiones/fingerprints se recalculan, qué ocurre con los cierres posteriores
(no los hay en el caso ordinario) y cómo se audita cada cambio.

### D3 — Motivo y actor

`[CONFIRMADO]` El cierre ya exige actor, UTC y fingerprint; el cierre fuera de orden exige
motivo (SPEC27). E4.10-AC2 exige «fecha/motivo» en la nueva versión.

| Opción | Impacto | Decisión del usuario |
| --- | --- | --- |
| A. Motivo obligatorio **solo** en la reapertura; el re-cierre hereda el motivo. | Menos fricción, pero puede perder el motivo de la corrección concreta. | Confirmar si basta un motivo por reapertura. |
| B. Motivo obligatorio **en reapertura y en re-cierre**, con campos separados. | Auditoría más rica; más fricción y más texto que validar. | Decidir si son dos motivos distintos y sus límites. |
| C. Actor fijo `usuario-unico` y motivo libre; sin roles nuevos. | Coherente con la app privada; no distingue personas. | Confirmar que no se introducen roles/permisos nuevos. |

`[PENDIENTE]` Longitud, obligatoriedad, trim y si el motivo aparece en la foto v2, en la
auditoría o en ambos. No inventar un mínimo distinto del ya usado por E4.9 (motivo de hasta
1000 caracteres en el contrato de cierre).

### D4 — Revalidación de cierres/dependencias posteriores

`[CONFIRMADO]` E4.10-AC3: revalidar dependencias posteriores **sin modificar
automáticamente su saldo inicial**. En la vía ordinaria no debería existir un cierre
posterior; si existe, E4.10-AC1 rechaza la reapertura (roadmap).

| Opción | Impacto | Decisión del usuario |
| --- | --- | --- |
| A. Bloquear la reapertura si existe cualquier cierre posterior, sin revalidar nada. | Simple y coherente con AC1; no cubre carreras ni dependencias no cerradas. | Confirmar que no se admite excepción. |
| B. Revalidar en lectura el S0/plan/posiciones de ciclos posteriores y **bloquear** si hay contradicción. | Protege la cadena; puede impedir una rectificación legítima por un efecto explicable. | Decidir si una contradicción bloquea o solo avisa. |
| C. Revalidar y **avisar** con auditoría, sin bloquear; el usuario decide continuar. | Flexibilidad; traslada el juicio financiero al usuario y puede dejar una cadena incoherente. | Decidir el nivel de bloqueo y quién lo aprueba. |

`[PENDIENTE]` Enumerar las dependencias (S0, plan siguiente, fotos, auxiliares, E4.11) y
distinguir «no modificar» de «no recalcular». No ampliar el algoritmo AC-20 por analogía.

### D5 — Relación con las fotos y con E4.11

`[CONFIRMADO]` v1 es inmutable; el re-cierre crea v2 y conserva v1; todas las versiones son
consultables; retención permanente; trimestre/año usan la versión vigente al generar el
agregado y registran cuál usaron (SPEC27, DT4).

`[PENDIENTE]` Qué versión es «vigente» mientras el ciclo está reabierto y sin v2; si un
agregado trimestral/anual generado antes de la reapertura se conserva o se marca; si un
agregado nuevo puede mezclar v1 de un ciclo con v2 de otro. Esto conecta con E4.11 y DT9.

| Opción | Impacto | Decisión del usuario |
| --- | --- | --- |
| A. Mientras está reabierto, la última versión **cerrada** (v1) sigue siendo la vigente para consulta; los agregados nuevos se bloquean o se marcan «pendiente de re-cierre». | Evita agregados con estado incompleto; puede retrasar informes. | Confirmar si se bloquea o se marca. |
| B. El agregado usa v1 y registra que el ciclo está reabierto; al crear v2, el agregado antiguo no se recalcula. | Conserva historia; puede mostrar un total que ya no coincide con la última foto. | Confirmar que el agregado antiguo queda congelado y visible. |
| C. El agregado se recalcula o se regenera con v2. | Contradice la inmutabilidad de agregados si ya estaban congelados; exige nueva versión de agregado. | Solo si se define una versión nueva de agregado, no una edición. |

### D6 — Plan final y auxiliares al reabrir/re-cerrar

`[CONFIRMADO]` La foto captura `SinPlan` o el plan final con líneas; no inventa líneas
(SPEC27, AC-17); los auxiliares se capturan si hay hechos. P1 permite editar el plan vivo sin
versionar cada edición; el cierre captura el estado final.

| Opción | Impacto | Decisión del usuario |
| --- | --- | --- |
| A. La reapertura conserva v1 y permite editar el plan vivo; v2 captura el plan vigente al re-cerrar. | Coherente con P1; puede cambiar el «plan final» sin que v2 explique la diferencia. | Decidir si v2 debe incluir un diff/auditoría frente a v1. |
| B. La reapertura bloquea el plan y solo permite corregir hechos T2/T1; v2 repite el plan de v1. | Reduce cambios silenciosos; puede impedir una rectificación legítima del plan. | Confirmar si el plan es rectificable. |
| C. `SinPlan` puede pasar a `Capturado` (o al revés) en v2, con motivo y auditoría. | Refleja la realidad; exige reglas claras y puede complicar la comparación. | Decidir si se permite el cambio de estado del plan. |

`[PENDIENTE]` Mismo razonamiento para Anticipos, Compartidos, Nómina, Revisión Comida y
Deuda: qué se recalcula, qué se conserva de v1 y qué se captura en v2.

### D7 — Idempotencia y concurrencia

`[CONFIRMADO]` E4.9 ya exige clave de intento, rechazo de payload distinto con
`IDEMPOTENCY_CONFLICT` y detección de cambio concurrente con `IMPACT_CHANGED`/
`REVISION_CONFLICT` (SPEC27; testplan AC-10/AC-11). El PR #200 implementa un patrón de
`cierre_attempts` con hash y replay.

| Opción | Impacto | Decisión del usuario |
| --- | --- | --- |
| A. Reutilizar el patrón de `cierre_attempts` con una clave propia para reapertura y otra para re-cierre. | Menos piezas nuevas; hay que decidir si la tabla admite ambos tipos o se separa. | Confirmar el comportamiento observable: reintento idéntico seguro, payload distinto 409. |
| B. Exigir `version`/estado esperado en la petición y rechazar con 409 si cambió. | Evita dobles reaperturas y carreras entre pestañas; añade complejidad de contrato. | Confirmar que se quiere concurrencia optimista explícita. |
| C. Serializar por ciclo con una transacción `IMMEDIATE` y un único estado. | Simple en app de un usuario; no resuelve dos pestañas si no hay versión esperada. | Decidir si basta el bloqueo de escritura. |

`[PENDIENTE]` Códigos exactos, forma de la clave y si la reapertura y el re-cierre comparten
espacio de idempotencia. No fijar nombres antes de QA E4.9.

### D8 — Fallo, cancelación y recuperación

| Opción | Impacto | Decisión del usuario |
| --- | --- | --- |
| A. Reapertura atómica (estado + auditoría); si el re-cierre falla, el ciclo queda reabierto y v1 sigue consultable. | Recuperable y sin foto a medias; exige un estado «reabierto» visible. | Confirmar que se permite quedarse reabierto. |
| B. Reapertura con cancelación explícita que vuelve a `Cerrado` sin crear v2. | Evita bloqueos; ¿es una tercera transición auditada? | Decidir si existe cancelación y cómo se registra. |
| C. Reapertura y re-cierre en una sola operación (no hay ventana intermedia). | Elimina el hueco, pero no permite corregir entre medias. | Solo si la rectificación se hace fuera de la app, lo que no parece el objetivo. |

### D9 — Ciclos antiguos (DT9) y límites de E4.10

`[CONFIRMADO]` DT9 no se habilita hasta otra especificación aprobada; la vía ordinaria solo
alcanza al último cierre (roadmap, P5/DT9). E4.10 **no** debe implementar una excepción para
ciclos antiguos ni usar restore de backup como reapertura.

| Opción | Impacto | Decisión del usuario |
| --- | --- | --- |
| A. E4.10 se limita al último cierre y DT9 queda fuera, con otra SPEC. | Máxima coherencia con P5; no resuelve rectificaciones antiguas. | Confirmar el límite y la fecha de la SPEC de DT9. |
| B. E4.10 incluye un modo excepcional para ciclos antiguos. | Rompe P5/DT9 y multiplica el impacto en fotos trimestrales/anuales. | No recomendado sin SPEC propia y aprobación explícita. |

---

## 4. Propuesta de estructura de SPEC28 (sin aprobar)

`[CONFIRMADO]` El tablero asigna **SPEC28** a E4.10 y la marca como no iniciada
([epic-board](../epic-board.md), tabla de specs). La estructura siguiente es `[PROPUESTA]`;
no crea la SPEC ni autoriza su desarrollo.

1. **Status, aprobación y base.** Dependencias E4.9, P5, DT4/DT5/DT9; evidencia de QA/merge
   de E4.9; versión de esquema vigente (no asumir v26).
2. **Functionality y alcance.** Reabrir el último cierre financiero y re-cerrar; qué incluye
   y qué no (DT9, ciclos antiguos, restore de backup, fotos trimestrales/anuales).
3. **Definiciones.** Último cierre, reabierto, rectificación, re-cierre, versión vigente,
   ventana de rectificación, dependencia posterior.
4. **Modelo de estado e invariantes.** Transiciones permitidas/prohibidas; atomicidad;
   conservación de v1; qué ocurre si falla el re-cierre; si hay cancelación.
5. **Datos y contratos.** Evento/tabla de reapertura; versión v2; auditoría; fingerprint;
   idempotencia; vínculo v1→v2; metadatos de app/esquema.
6. **T1/T2/T3 durante la reapertura.** Qué se desbloquea, qué se audita, qué sigue
   bloqueado, cómo se evita afectar a otros ciclos.
7. **Revalidación de dependencias posteriores.** Qué se comprueba, con qué corte, qué
   bloquea y qué solo avisa; prohibición de modificar S0/plan ajenos.
8. **API.** Reabrir, re-cerrar, estado y foto; rutas canónicas **después** de E4.9; errores
   y códigos; idempotencia.
9. **UI.** Confirmación con motivo, estado reabierto, comparación v1/v2, errores y sesión.
10. **Vacío/carga/error/bloqueo.** Sin foto parcial; v1 siempre consultable; reintento.
11. **Validación y casos límite.** Reapertura no ordinaria, cierre posterior, carrera,
    doble re-cierre, fallo de transacción, plan/auxiliares, ciclo sin hechos.
12. **Exclusiones.** DT9, backup como reapertura, fotos E4.11, recálculo retroactivo,
    cambios de permisos.
13. **Acceptance checks candidatos** (sin aprobar):
    - AC-01 reabrir el último cierre conserva v1 y registra actor/motivo/UTC.
    - AC-02 rechazar la reapertura si existe un cierre posterior.
    - AC-03 rechazar la reapertura de un ciclo no último (DT9 no habilitado).
    - AC-04 reapertura atómica: no hay estado parcial ni auditoría huérfana.
    - AC-05 el re-cierre crea v2, conserva v1 intacta y registra metadatos completos.
    - AC-06 reintento idéntico y payload distinto (idempotencia) sin duplicar versiones.
    - AC-07 dos reaperturas/re-cierres concurrentes no crean v2/v3 duplicadas.
    - AC-08 T1 solo se permite en la ventana reabierta y con las guardas aprobadas.
    - AC-09 T2 posterior se audita y no altera v1.
    - AC-10 las dependencias posteriores se revalidan sin modificar su S0/plan.
    - AC-11 fallo antes del commit del re-cierre no deja v2 ni foto a medias.
    - AC-12 consultar v1 y v2 devuelve valores persistidos, sin recálculo.
    - AC-13 una carrera con un cierre posterior se rechaza/bloquea de forma motivada.
    - AC-14 la cadena de auditoría v1→reapertura→v2 es completa y consultable.
    - AC-15 el ciclo reabierto sigue reservando la posición de «último» (si se decide D1-A).
14. **Trazabilidad y límites.** Enlaces a SPEC27, AC-20, testplan E4.9, DT6 y E4.11.

### Criterios de entrada para SPEC28

- `[PENDIENTE]` E4.9 **mergeado** y con QA independiente; rutas canónicas, forma de la foto,
  auditoría y política de versiones estabilizadas.
- `[PENDIENTE]` AC de E4.9 relevantes para E4.10 con evidencia (v1, inmutabilidad,
  idempotencia, concurrencia, cierre fuera de orden, foto no recalculada); no basta el
  diseño documental.
- `[PENDIENTE]` Decisiones D1–D4 y D6–D8 del usuario; D5 coordinada con E4.11.
- `[PENDIENTE]` DT9 explícitamente fuera de alcance o con SPEC propia aprobada.
- `[PENDIENTE]` DT6/T-BKP: fixtures para DEV; cierre real solo con evidencia externa.
- `[PENDIENTE]` Versión de esquema reservada después de v25; no asumir que E4.10 usa v25.
- `[CONFIRMADO]` Aprobar la SPEC no autoriza DEV; el DEV requiere autorización separada.

---

## 5. Riesgos y mitigaciones

| Riesgo | Por qué importa | Mitigación propuesta |
| --- | --- | --- |
| **Reabrir por backup** | Restaurar una copia no es reabrir: rebobina identidad, auditoría y puede perder cierres/fotos posteriores. | Prohibirlo en SPEC28; la reapertura es un evento de app, no un restore; DT6 es un gate separado. |
| **Foto mutable** | Si el re-cierre actualiza v1 en vez de crear v2, se pierde la evidencia y se rompe la auditoría. | Mantener triggers de inmutabilidad; v2 como nueva fila; probar que v1 no cambia. |
| **Hueco reapertura → re-cierre** | El ciclo queda en un estado intermedio; pueden pasar días, cambiar fuentes o abrirse otra reapertura. | Estado explícito, reserva de «último», ventana/límite, revalidación al re-cerrar y cancelación auditada si se aprueba. |
| **Doble versión** | Dos re-cierres concurrentes o reintentos podrían crear v2/v3 o duplicar la foto. | Idempotencia por clave, versión esperada, transacción `IMMEDIATE` y secuencia `MAX+1` ya existente. |
| **Pérdida de auditoría** | Si la reapertura no se registra o solo se guarda en la foto, no se puede reconstruir quién rectificó ni por qué. | Evento append-only con actor/UTC/motivo, vínculo v1→v2 y comparación de valores; extender `cierre_audit` o tabla nueva con migración. |
| **Desbloqueo T1 indiscriminado** | Editar hechos de un ciclo cerrado puede alterar totales ya usados por cierres/fotos posteriores. | Limitar a la ventana reabierta, auditar cada escritura, revalidar dependencias y no tocar S0 ajenos. |
| **Revalidación insuficiente** | AC-20 solo compara inversión; una rectificación puede afectar plan, auxiliares o S0 y pasar desapercibida. | Matriz DT5 explícita y decisión D4; no ampliar por analogía. |
| **Confusión con DT9** | Convertir E4.10 en una puerta para ciclos antiguos rompe P5 y el efecto en fotos trimestrales/anuales. | SPEC28 limitada al último cierre; DT9 en SPEC aparte y aprobación explícita. |

---

## 6. Para el usuario

- **D2 (la más importante):** ¿la reapertura ordinaria debe permitir corregir **hechos T1**
  (Movimientos, Compras) dentro de la ventana del ciclo, o solo correcciones T2? Si se
  permite T1, ¿con qué límite temporal y qué se audita?
- **D1:** si un ciclo se reabre y no se re-cierra, ¿sigue ocupando la posición de «último
  cierre» y bloquea reabrir uno anterior? Recomendación de trabajo: sí, para evitar dos
  ventanas abiertas.
- **D3:** ¿motivo obligatorio solo al reabrir o también al re-cierre? ¿Actor fijo
  `usuario-unico` o identidad configurable?
- **D4:** si una dependencia posterior no cuadra, ¿la reapertura/re-cierre se **bloquea** o
  solo se **avisa** con auditoría? E4.10-AC3 prohíbe modificar automáticamente el S0.
- **D5/E4.11:** mientras el ciclo está reabierto y sin v2, ¿los agregados trimestrales/anuales
  se bloquean, se marcan como pendientes o usan v1? ¿Un agregado ya generado se conserva
  congelado?
- **D6:** ¿se puede cambiar el plan final o los auxiliares en v2, y debe v2 explicar la
  diferencia frente a v1?
- **D9:** confirmar que E4.10 **no** habilita ciclos antiguos; DT9 requiere SPEC propia y
  aprobación explícita.
- **Estado:** el PR #200 de E4.9 está **OPEN/draft**; hasta su QA y merge, los nombres de
  endpoints, la auditoría de reapertura y la política de versiones no deben congelarse.
