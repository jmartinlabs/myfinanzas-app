# 28 — E4.10 Reabrir el último cierre y volver a cerrar: Brainstorming

**DRAFT — no aprobada; no autoriza DEV ni merge.**
Status: **DRAFT documental.** No hay decisiones del usuario, no hay SPEC aprobada, no hay
AC en PASS y no se autoriza desarrollo, migración, datos reales ni merge.
Task ID: `E4.10 · SPEC` (canonical), soporte documental `SPEC28`.
Base: rama `docs/next-packages`, commit `eefc20d`. E4.9 se lee en el PR **#200**
(`feat/e49-cierre`, head `2fe5d01`), **OPEN y en draft**, sin QA final ni merge; sus AC
siguen **UNRUN**. DT6/T-BKP sigue abierto y E3.5/FIN_NETA condiciona el cierre real.

**Leyenda**

- `[CONFIRMADO]` — regla de un documento aprobado o decisión ya registrada.
- `[PROPUESTA]` — detalle técnico/funcional candidato, no aprobado.
- `[PENDIENTE]` — decisión o evidencia que aún no existe.
- `[PENDIENTE · provisional E4.9]` — depende de QA/merge de E4.9; no se congela aquí.

Fuentes: [roadmap E4.10](roadmap.md#e410--reabrir-el-último-cierre-y-volver-a-cerrar),
[P5/DT9](roadmap.md#decisiones-abiertas-y-puntos-de-autorización),
[SPEC27](27-e49-cierre-financiero-specification.md),
[testplan E4.9](27-e49-cierre-financiero-testplan.md),
[SPEC26](26-e48-precierre-specification.md),
[análisis E4.10](investigations/e410-reapertura-analysis-2026-11-04.md),
[brief E4.9](investigations/e49-decision-brief-2026-11-04.md),
[alcance E4.11](investigations/e411-fotografias-scope-2026-11-04.md),
[arquitectura](guidelines/architecture.md), [UI](guidelines/ui.md),
[calidad](guidelines/quality.md) y [seguridad](guidelines/security.md).

---

## 1. Punto de partida

`[CONFIRMADO]` E4.10 es la **vía ordinaria** para rectificar el último ciclo cerrado
financieramente y generar otra foto (roadmap, P5). Solo el cierre con el `Fin`
cronológicamente más reciente y sin otro ciclo posterior cerrado es reabrible; un cierre
tardío de un ciclo anterior no habilita su reapertura ordinaria (SPEC27, DT3). DT9 —la
rectificación excepcional de ciclos antiguos— no se habilita hasta otra especificación
aprobada.

`[CONFIRMADO]` E4.9 ya fija el modelo que E4.10 debe reutilizar: v1 inmutable, re-cierre
como v2 sin alterar v1, todas las versiones consultables, retención permanente, auditoría
con actor/UTC/motivo y fingerprint propio, cierre fuera de orden con motivo y comprobación
de coherencia, y T1/T2/T3 con impacto y auditoría (SPEC27).

`[PENDIENTE · provisional E4.9]` E4.9 solo implementa el camino de v1: `confirmCierre`
inserta `version=1` y bloquea con `ALREADY_CLOSED`; no existe camino de re-cierre. El estado
persistido solo admite `Cerrado`, no hay estado «reabierto» ni auditoría de reapertura. La
tabla `cierre_audit` solo admite las acciones `cierre` y `cierre_fuera_de_orden`. Por tanto,
E4.10 necesita una evolución de contrato, no una segunda semántica de cierre.

### 1.1 Contratos reutilizados y su estado real

| Contrato | Estado | Qué significa para E4.10 |
| --- | --- | --- |
| **Versiones v1→v2** | `[CONFIRMADO]` DT4; `[PENDIENTE · provisional E4.9]` implementación del re-cierre. | La reapertura no puede ser un `UPDATE` de `cierres.estado` ni de la foto v1. El re-cierre crea una fila nueva. |
| **Inmutabilidad** | `[CONFIRMADO]` cierre y foto no se actualizan ni se borran. | v1 y su foto quedan intactas durante y después de la reapertura; los triggers deben seguir activos. |
| **Auditoría** | `[CONFIRMADO]` principio actor/UTC/motivo/fingerprint; `[PENDIENTE · provisional E4.9]` acciones/campos y soporte. | La reapertura exige evento propio, append-only, con vínculo v1→v2 y sin auditoría huérfana; la tabla/acciones no se congelan. |
| **Fingerprint** | `[CONFIRMADO]` huella propia sobre las fuentes; `financeRevision` no la sustituye. | El re-cierre necesita fingerprint de la vista previa y comparación con el estado confirmado. |
| **Fuera de orden** | `[CONFIRMADO]` AC-20; motivo y coherencia al mismo corte. | No se reutiliza por analogía: si existe un cierre posterior, la vía ordinaria se rechaza. |
| **T1/T2/T3** | `[CONFIRMADO]` T1 bloquea, T2 revalida con auditoría, T3 se permite. | La ventana de rectificación debe declarar qué niveles desbloquea; no se presupone T1. |
| **Endpoints** | `[PENDIENTE · provisional E4.9]` | No se fijan rutas de reapertura ni de re-cierre en este documento. |
| **Forma de la reapertura** | `[PENDIENTE · provisional E4.9]` | Evento, tabla, versión de estado o campo derivado: no decidido. |
| **Política de versiones** | `[PENDIENTE · provisional E4.9]`; la regla funcional la decide D5. | Si «reabierto» consume versión, cuál es la vigente sin v2 y si v2 puede reabrirse para v3. |

---

## 2. Decisiones D1–D9

### D1 — Alcance: qué es «último cierre» y qué pasa al reabrirlo

`[CONFIRMADO]` Solo es reabrible el ciclo cerrado con el `Fin` más reciente y sin otro
ciclo posterior cerrado (SPEC27, DT3; P5; roadmap E4.10-AC1). La fecha de registro es solo
auditoría.

`[PENDIENTE]` Si el último cierre se reabre y queda **sin v2**, ¿sigue ocupando la posición
de «último»? Si deja de contar como cerrado, un cierre anterior podría pasar a ser «el
último» y abrirse también, con dos rectificaciones simultáneas y versiones ambiguas.
También queda abierto si, tras un re-cierre v2, ese mismo cierre puede volver a reabrirse
para crear v3 o si la vía ordinaria admite una sola rectificación por cierre.

| Opción | Impacto | Decisión del usuario |
| --- | --- | --- |
| A. El ciclo reabierto **reserva** la posición de último hasta que se re-cierre o se cancele explícitamente. | Evita dos ventanas abiertas y ramas de versiones; puede bloquear la operación si la rectificación se abandona. | Confirmar la reserva y si existe cancelación (D8) para no dejar un bloqueo indefinido. |
| B. Un ciclo reabierto deja de ser «último»; el anterior pasa a serlo. | Permite varias rectificaciones, pero multiplica versiones y hace ambiguo qué foto es la vigente. | Solo si se acepta un modelo de múltiples ventanas abiertas, hoy no previsto. |
| C. La reapertura exige un compromiso de re-cierre (ventana temporal o cancelación) y no se permite abandonarla. | Reduce el hueco, pero añade estado, trabajo programado y posible bloqueo operativo. | Decidir si hay ventana temporal y qué ocurre al vencer. |

**Recomendación propuesta:** **A**, con una salida explícita y auditada (re-cierre o
cancelación). Es la única opción que mantiene una sola versión vigente y evita que dos
ciclos se rectifiquen a la vez. La reserva no impide cerrar un ciclo posterior; si eso
ocurre, el re-cierre de la ventana se detiene y se resuelve según D8/AC16.

**Qué decide el usuario:** si «reabierto» reserva la posición de último; si existe
cancelación; y si la rectificación es única o repetible tras v2 (v3).

### D2 — Ventana de rectificación y alcance de T1

`[CONFIRMADO]` T1 bloquea con `HISTORY_LOCKED`; T2 exige impacto, motivo y auditoría con la
foto intacta; T3 se permite (SPEC27). La ventana y el S0 son identidad congelada y no se
recalculan (SPEC27, DT3). El roadmap habla de «rectificar por la vía ordinaria el último
ciclo cerrado», pero no detalla si se pueden editar hechos ya capturados.

| Opción | Impacto | Decisión del usuario |
| --- | --- | --- |
| A. Reabrir **solo** habilita correcciones T2 (clasificación, referencias, reparto, plan vivo, auxiliares) y no desbloquea T1. | Menor riesgo: no se reescriben Movimientos ni Compras cerradas; puede no servir para corregir un hecho mal capturado. | Confirmar si la rectificación ordinaria excluye los hechos T1. |
| B. Reabrir desbloquea T1 **solo** en la ventana del ciclo y solo hasta el re-cierre o la cancelación, con guardas y auditoría por escritura. | Permite corregir Movimientos/Compras mal capturados; exige bloquear otras ventanas y demostrar que no se toca S0 ni la ventana. | Decidir el alcance T1 exacto: qué entidades, qué fechas y qué queda prohibido. |
| C. Desbloqueo T1 con **ventana temporal** y re-cierre o re-bloqueo automático. | Acota el hueco, pero introduce trabajo programado y riesgo de rectificación a medias. | Decidir duración y qué ocurre al vencer. |

**Recomendación propuesta:** **B acotada**: permitir T1 solo para Movimientos y
Compras/rectificaciones/anulaciones con fecha dentro de la ventana del ciclo, nunca para
S0, `inicio`/`Fin` ni la identidad congelada. Si E4.9 confirma la ampliación T1 a Ventas
E4.2, E4.10 la hereda; no se presupone aquí. Cada escritura T1 se audita y la ventana se
cierra al re-cerrar (y al cancelar, si D8-B). Si el usuario prefiere el mínimo riesgo, **A**
es coherente, pero deja sin vía ordinaria la corrección de un hecho mal capturado del
último ciclo.

**Qué decide el usuario:** si se desbloquea T1; qué entidades exactas; si hay límite
temporal; y qué se audita por cada escritura.

### D3 — Motivo y actor

`[CONFIRMADO]` El cierre exige actor, UTC y fingerprint; el cierre fuera de orden exige
motivo (SPEC27). E4.10-AC2 exige fecha/motivo en la nueva versión.
`[PENDIENTE · provisional E4.9]` El contrato de cierre de E4.9 usa motivos de hasta 1000
caracteres; QA/merge debe confirmarlo antes de fijar el límite.

| Opción | Impacto | Decisión del usuario |
| --- | --- | --- |
| A. Motivo obligatorio **solo** en la reapertura; el re-cierre hereda el motivo. | Menos fricción, pero puede perder el motivo de la corrección concreta. | Confirmar si basta un motivo por reapertura. |
| B. Motivo obligatorio **en reapertura y en re-cierre**, con campos separados. | Auditoría más rica; más fricción y más texto que validar. | Decidir si son dos motivos distintos y sus límites. |
| C. Actor fijo `usuario-unico` y motivo libre; sin roles nuevos. | Coherente con la app privada; no distingue personas. | Confirmar que no se introducen roles/permisos nuevos. |

**Recomendación propuesta:** **B + C**: motivo obligatorio y separado en reapertura
(por qué se reabre) y re-cierre (qué se rectificó), ambos con el mismo límite de E4.9,
trim y sin mínimo inventado; actor tomado de la sesión, no del cliente, sin roles nuevos.
El motivo se guarda en auditoría y en la identidad de la versión re-cierrada; no se usa
como sustituto del fingerprint.

**Qué decide el usuario:** uno o dos motivos; longitud/obligatoriedad; identidad del actor;
y si el motivo aparece en la foto, en la auditoría o en ambas.

### D4 — Revalidación de cierres y dependencias posteriores

`[CONFIRMADO]` E4.10-AC3 exige revalidar dependencias posteriores **sin modificar
automáticamente su saldo inicial**. E4.10-AC1 rechaza la reapertura si existe un cierre
posterior. En la vía ordinaria no debería existir un cierre posterior, pero una carrera o
un cierre tardío puede crearlo.

`[PENDIENTE]` Enumerar las dependencias (S0 y plan del ciclo siguiente, fotos, auxiliares,
agregados E4.11, precontrol) y distinguir «no modificar» de «no recalcular». No se amplía
el algoritmo AC-20 por analogía.

| Opción | Impacto | Decisión del usuario |
| --- | --- | --- |
| A. Bloquear la reapertura si existe cualquier cierre posterior, sin revalidar nada más. | Simple y coherente con AC1; no cubre dependencias no cerradas ni carreras. | Confirmar que no se admite excepción. |
| B. Revalidar en lectura las dependencias posteriores y **bloquear** si hay contradicción. | Protege la cadena; puede impedir una rectificación legítima por un efecto explicable. | Decidir la matriz exacta y qué contradicción bloquea. |
| C. Revalidar y **avisar** con auditoría, sin bloquear; el usuario decide continuar. | Flexibilidad; traslada el juicio financiero al usuario y puede dejar una cadena incoherente. | Decidir el nivel de bloqueo y quién lo aprueba. |

**Recomendación propuesta:** **A para cierres posteriores** (AC1 no admite excepción en la
vía ordinaria) y **B para dependencias posteriores no cerradas**, con una matriz explícita
y aprobada. Una contradicción bloquea; un aviso solo se admite para diferencias
declaradas no bloqueantes. La revalidación es de solo lectura y se registra con los valores
comparados. No se modifica automáticamente ningún S0 ni plan ajeno.

**Qué decide el usuario:** la lista de dependencias; si una contradicción bloquea o solo
avisa; y qué evidencia se guarda.

### D5 — Relación con las fotos y con E4.11

`[CONFIRMADO]` v1 es inmutable; el re-cierre crea v2 y conserva v1; todas las versiones son
consultables; retención permanente. Trimestre/año usan la versión vigente al generar el
agregado, registran cuál usaron y quedan congelados; no se recalculan (SPEC27, DT4).

`[PENDIENTE]` Qué versión es «vigente» mientras el ciclo está reabierto y sin v2; si un
agregado trimestral/anual generado antes de la reapertura se conserva o se marca; si un
agregado nuevo puede mezclar v1 de un ciclo con v2 de otro. Esto conecta con E4.11 y DT9.

| Opción | Impacto | Decisión del usuario |
| --- | --- | --- |
| A. Mientras está reabierto, la última versión **cerrada** (v1) sigue siendo la vigente para consulta; los agregados nuevos que incluyan ese ciclo se bloquean o se marcan «pendiente de re-cierre». | Evita agregados con estado incompleto; puede retrasar informes. | Confirmar si se bloquea o se marca. |
| B. El agregado usa v1 y registra que el ciclo está reabierto; al crear v2, el agregado antiguo no se recalcula. | Conserva historia; puede mostrar un total que ya no coincide con la última foto. | Confirmar que el agregado antiguo queda congelado y visible. |
| C. El agregado se recalcula o se regenera con v2. | Contradice la inmutabilidad de los agregados ya congelados; exige una nueva versión de agregado, no una edición. | Solo si se define una versión nueva de agregado. |

**Recomendación propuesta:** **A**: v1 sigue consultable y etiquetada como última versión
cerrada; la generación de agregados nuevos que incluyan un ciclo reabierto se bloquea
hasta el re-cierre (o la cancelación, si D8-B); los agregados ya generados se conservan
congelados y visibles, sin recálculo. Coordinar con E4.11 P4.

**Qué decide el usuario:** bloquear o marcar agregados; si el agregado antiguo se conserva
congelado; y la regla de mezcla de versiones entre ciclos.

### D6 — Plan final y auxiliares al reabrir y re-cerrar

`[CONFIRMADO]` La foto captura `SinPlan` o el plan final con líneas; no inventa líneas
(SPEC27, AC-17). Los auxiliares se capturan si hay hechos. P1 permite editar el plan vivo
sin versionar cada edición; el cierre captura el estado final.

| Opción | Impacto | Decisión del usuario |
| --- | --- | --- |
| A. La reapertura conserva v1 y permite editar el plan vivo; v2 captura el plan vigente al re-cerrar, con comparación frente a v1. | Coherente con P1; puede cambiar el «plan final» sin que v2 explique la diferencia si no se exige diff. | Decidir si v2 debe incluir un diff/auditoría frente a v1. |
| B. La reapertura bloquea el plan y solo permite corregir hechos T2/T1; v2 repite el plan de v1. | Reduce cambios silenciosos; puede impedir una rectificación legítima del plan. | Confirmar si el plan es rectificable. |
| C. `SinPlan` puede pasar a `Capturado` (o al revés) en v2, con motivo y auditoría. | Refleja la realidad; exige reglas claras y puede complicar la comparación. | Decidir si se permite el cambio de estado del plan. |

**Recomendación propuesta:** **A + C**: permitir editar el plan vivo y cambiar
`SinPlan`↔`Capturado` con motivo; v2 captura el estado vigente y la auditoría guarda una
comparación frente a v1. Los auxiliares se capturan desde las fuentes vigentes; si una
fuente deja de estar disponible, v2 declara `No disponible` con motivo y no copia v1 como
si fuera actual. v2 repite el contrato completo de foto, no solo el diff.

**Qué decide el usuario:** si el plan es rectificable; si se exige comparación frente a
v1; si se permite cambiar `SinPlan`↔`Capturado`; y qué auxiliares entran en v2.

### D7 — Idempotencia y concurrencia

`[CONFIRMADO]` E4.9 exige clave de intento, rechazo de payload distinto con
`IDEMPOTENCY_CONFLICT` y detección de cambio concurrente con `IMPACT_CHANGED`/
`REVISION_CONFLICT` (SPEC27; testplan AC-10/AC-11). `[PENDIENTE · provisional E4.9]` El
PR #200 implementa un patrón de intentos con hash y replay, no QA/mergeado.

| Opción | Impacto | Decisión del usuario |
| --- | --- | --- |
| A. Reutilizar el patrón de intentos con una clave propia para reapertura y otra para re-cierre. | Menos piezas nuevas; hay que decidir si la tabla admite ambos tipos o se separa. | Confirmar el comportamiento observable: reintento idéntico seguro, payload distinto 409. |
| B. Exigir `version`/estado esperado en la petición y rechazar si cambió. | Evita dobles reaperturas y carreras entre pestañas; añade complejidad de contrato. | Confirmar que se quiere concurrencia optimista explícita. |
| C. Serializar por ciclo con una transacción `IMMEDIATE` y un único estado. | Simple en app de un usuario; no resuelve dos pestañas si no hay versión esperada. | Decidir si basta el bloqueo de escritura. |

**Recomendación propuesta:** **A + B + C**: espacios de idempotencia separados para
reapertura y re-cierre, versión/estado esperado obligatorio y transacción `IMMEDIATE` por
ciclo. Comportamiento observable: reintento idéntico devuelve el mismo resultado; payload
distinto → conflicto; versión esperada obsoleta → conflicto; nunca se crean dos versiones
por reintento o carrera. Nombres de códigos y rutas: `[PENDIENTE · provisional E4.9]`.

**Qué decide el usuario:** si acepta concurrencia optimista explícita y el comportamiento
observable ante reintento/carrera. Los nombres internos no son una decisión funcional.

### D8 — Fallo, cancelación y recuperación

| Opción | Impacto | Decisión del usuario |
| --- | --- | --- |
| A. Reapertura atómica (estado + auditoría); si el re-cierre falla, el ciclo queda reabierto y v1 sigue consultable. | Recuperable y sin foto a medias; exige un estado «reabierto» visible y una salida. | Confirmar que se permite quedarse reabierto. |
| B. Reapertura con cancelación explícita que vuelve a `Cerrado` sin crear v2. | Evita bloqueos; es una tercera transición auditada. | Decidir si existe cancelación y cómo se registra. |
| C. Reapertura y re-cierre en una sola operación (no hay ventana intermedia). | Elimina el hueco, pero no permite corregir entre medias. | Solo si la rectificación se hace fuera de la app, lo que no es el objetivo. |

`[PENDIENTE]` Sin una salida (re-cierre o cancelación), un fallo repetido podría dejar el
ciclo reabierto y bloquear la posición de «último» según D1. La decisión de D8 condiciona
esa salida.

**Recomendación propuesta:** **A + B**. La reapertura y el re-cierre son transacciones
independientes y atómicas. Un fallo del re-cierre deja el ciclo reabierto, v1 consultable y
sin v2 parcial. La cancelación, si se aprueba, es un evento auditado que vuelve a
`Cerrado(vN)` sin crear foto. **C se descarta** porque contradice la capacidad de corregir
entre la reapertura y el re-cierre.

**Qué decide el usuario:** si se permite permanecer reabierto; si existe cancelación; y
cómo se audita.

### D9 — Ciclos antiguos (DT9) y límites de E4.10

`[CONFIRMADO]` DT9 no se habilita hasta otra especificación aprobada; la vía ordinaria solo
alcanza al último cierre (roadmap, P5/DT9). E4.10 no implementa una excepción para ciclos
antiguos ni usa la restauración de backup como reapertura.

| Opción | Impacto | Decisión del usuario |
| --- | --- | --- |
| A. E4.10 se limita al último cierre y DT9 queda fuera, con otra SPEC. | Máxima coherencia con P5; no resuelve rectificaciones antiguas. | Confirmar el límite y el momento de la SPEC de DT9. |
| B. E4.10 incluye un modo excepcional para ciclos antiguos. | Rompe P5/DT9 y multiplica el impacto en fotos trimestrales/anuales y cierres posteriores. | No recomendado sin SPEC propia y aprobación explícita. |

**Recomendación propuesta:** **A**. DT9 es una capacidad distinta, con efectos en
agregados y cierres posteriores que E4.10 no puede resolver por inferencia.

**Qué decide el usuario:** confirmar el límite y si DT9 tendrá SPEC propia; no se decide
aquí su contenido.

---

## 3. Coverage

`[PROPUESTA]` E4.10 cubre:

- reabrir el último cierre financiero por la vía ordinaria, con motivo, actor y auditoría;
- mantener v1 y su foto inmutables durante todo el ciclo;
- permitir la rectificación T2/T3 y, si se aprueba D2, T1 acotada;
- revalidar dependencias posteriores sin modificar su S0/plan;
- re-cerrar creando una versión nueva con el contrato completo de foto;
- consultar v1 y v2 con selección explícita de versión;
- rechazar reaperturas no ordinarias, cierres posteriores, intentos de salto por API,
  dobles versiones y fallos atómicos.

No cubre: DT9, ciclos antiguos, restauración de backup como reapertura, agregados
trimestrales/anuales E4.11, recálculo retroactivo, valoración E4.3, Ventas E4.2,
conciliaciones E4.4, cambios de permisos, despliegue ni datos reales.

---

## 4. Gates abiertos

- `[PENDIENTE]` E4.9 **mergeado** y con QA independiente; rutas, forma de foto, auditoría
  y política de versiones estabilizadas. Sin eso, SPEC28 no puede congelar contrato.
- `[PENDIENTE]` Evidencia de los AC de E4.9 relevantes: v1, inmutabilidad, idempotencia,
  concurrencia, cierre fuera de orden y foto no recalculada.
- `[PENDIENTE]` Decisiones D1–D4 y D6–D8 del usuario; D5 coordinada con E4.11.
- `[PENDIENTE]` DT9 explícitamente fuera de alcance o con SPEC propia aprobada.
- `[PENDIENTE]` DT6/T-BKP: fixtures para DEV; cierre real solo con evidencia externa.
- `[PENDIENTE]` Versión de esquema reservada después de la que use E4.9; no se asume aquí.
- `[CONFIRMADO]` Aprobar SPEC28 no autoriza DEV; el DEV exige autorización separada.

---

## 5. Decisiones materiales para el usuario (6 bloques)

1. **Alcance y límite (D1 + D9).** ¿El ciclo reabierto reserva la posición de «último»
   hasta re-cierre o cancelación? ¿La rectificación es única o repetible tras v2? ¿Se
   confirma que DT9 queda fuera y exige SPEC propia?
2. **Ventana T1 (D2).** ¿La reapertura ordinaria permite corregir hechos T1 (Movimientos,
   Compras) o solo T2? Si permite T1, ¿con qué límites y auditoría?
3. **Motivo y actor (D3).** ¿Motivo solo al reabrir o también al re-cerrar? ¿Actor fijo de
   sesión `usuario-unico` sin roles nuevos?
4. **Revalidación y recuperación (D4 + D8).** ¿Una contradicción de dependencias
   posteriores bloquea o solo avisa? ¿Se permite permanecer reabierto y cancelar sin v2?
5. **Versiones, agregados, plan y auxiliares (D5 + D6).** ¿Qué versión es la vigente sin
   v2? ¿Se bloquean o marcan los agregados E4.11? ¿El plan y los auxiliares son
   rectificables y v2 debe comparar con v1?
6. **Concurrencia observable (D7).** ¿Se acepta versión esperada + idempotencia, con
   reintento idéntico seguro y conflicto ante payload/versión distintos? La **forma
   definitiva de la reapertura** (evento, tabla, estado o versión) no se decide aquí:
   queda `[PENDIENTE · provisional E4.9]`.

**No se decide en este documento:** DT9, la forma definitiva de reapertura, las rutas
canónicas, la tabla de auditoría ni la política de versiones dependiente de E4.9. Los
detalles marcados `[PENDIENTE]` dentro de los seis bloques (v3, `SIN_CAMBIOS`, inclusión
exacta en el fingerprint) se resuelven con la decisión del bloque o en el paquete DEV; no
son decisiones adicionales.
