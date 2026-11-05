# 28 — E4.10 Reabrir el último cierre y volver a cerrar: Specification

**DRAFT — decisiones aprobadas; no autoriza DEV ni merge.**
Status: **DRAFT documental.** Sin AC en PASS, sin DEV, sin migración, sin datos reales y
sin merge. **D1–D9 y `SIN_CAMBIOS` aprobadas por el usuario el 2026-11-05**; solo las
decisiones P2/P3/P6/P7/P8 de SPEC29 siguen abiertas. Los AC de E4.10 siguen **UNRUN**; los
PASS de fixtures/parciales de E4.9 no son PASS de aceptación.

**Registro de decisiones aprobadas (2026-11-05):**

| Decisión | Texto aprobado |
| --- | --- |
| **D1-A** | Una reapertura activa; reserva del último cierre; v3+ secuencial sobre la última versión cerrada; no se registran/cierran cierres posteriores incompatibles durante la ventana. |
| **D2-B** | T1 permitido solo dentro de la ventana autorizada del ciclo, para Movimientos, Compras y Ventas, con guardas, impacto y auditoría; S0, `inicio`, `Fin` y otros ciclos protegidos. |
| **D3-B+C** | Motivo obligatorio y separado en reapertura y re-cierre, máximo 1000 caracteres, actor de sesión, sin roles nuevos; trazabilidad en auditoría y versión. |
| **D5-A** | Mientras exista reapertura, la última foto cerrada es consultable pero no vigente sin advertencia; agregados nuevos excluyen el ciclo y lo marcan `PendienteReCierre`; agregados ya generados congelados; mezcla de versiones solo con composición exacta registrada. |
| **D4** | Revalidación de solo lectura de S0/plan siguiente, fotos, auxiliares, agregados y precontrol. Contradicciones materiales bloquean; avisos solo si se acredita que son no bloqueantes; nunca se modifica automáticamente S0 ni planes ajenos. |
| **D6-A+C** | Plan vivo rectificable; `SinPlan`/`Capturado` con motivo y auditoría; nueva foto completa y comparación con `vN`; auxiliares de fuentes vigentes, sin inventar datos ni copiar valores antiguos como actuales. |
| **D7-A+B+C** | Idempotencia separada por operación; versión/estado esperado obligatorio; transacción atómica por ciclo; reintentos seguros y conflictos ante cambios concurrentes; nunca duplicar ventanas ni fotos. |
| **D8 corregida** | Cancelación sin foto solo si se acredita ausencia de cambios materiales desde la reapertura; no basta igualdad de importes: hechos, relaciones, clasificación, plan y componentes. Ante incertidumbre, bloquear. Sin cierre posterior y con cambios materiales, re-cierre `vN+1`; con cierre posterior, re-cierre ordinario bloqueado y solo recuperación extraordinaria documentada/aprobada por separado. |
| **D9-A** | Solo último cierre; DT9 fuera de alcance. |
| **SIN_CAMBIOS** | No se crea nueva foto si no hay cambios materiales acreditados: rechazo explícito `SIN_CAMBIOS`; cancelación auditada D8 cuando proceda y ausencia verificada; no basta igualdad de importes/totales; si hubo cambios revertidos o falta evidencia, no se asume equivalencia ni se cancela automáticamente. |

**Pendiente:** solo P2/P3/P6/P7/P8 de SPEC29 y los detalles de representación/implementación
no decididos. No se convierten en decisiones por inferencia.

Task ID: `E4.10 · SPEC` (canonical), soporte documental `SPEC28`.
Base de esta incorporación: `main` **`436fe3a`** (2026-11-05; revisión anterior `3842831`). E4.9 está **integrado** en
`0176ffc` (#200), con QA **APTO CON RESERVAS** y CI post-merge `42000330143`; `a806fd9`
es E4.5 (#216), no E4.9. Los AC de E4.10 siguen **UNRUN**; los PASS de fixtures/parciales
de E4.9 no son PASS de aceptación. DT6/T-BKP sigue abierto. v25 está ocupada por E4.9:
E4.10 no reserva versión en esta SPEC. El brainstorming enlazado conserva su fecha
histórica; ante discrepancia de vigencia, prevalece esta cabecera.

Context and brainstorming: [28-e410-reapertura-brainstorming.md](28-e410-reapertura-brainstorming.md),
[análisis E4.10](investigations/e410-reapertura-analysis-2026-11-04.md),
[roadmap E4.10](roadmap.md#e410--reabrir-el-último-cierre-y-volver-a-cerrar),
[P5/DT9](roadmap.md#decisiones-abiertas-y-puntos-de-autorización),
[SPEC27](27-e49-cierre-financiero-specification.md),
[testplan E4.9](27-e49-cierre-financiero-testplan.md),
[SPEC26](26-e48-precierre-specification.md),
[brief E4.9](investigations/e49-decision-brief-2026-11-04.md),
[alcance E4.11](investigations/e411-fotografias-scope-2026-11-04.md),
[arquitectura](guidelines/architecture.md), [UI](guidelines/ui.md),
[calidad](guidelines/quality.md) y [seguridad](guidelines/security.md).

**Leyenda**

- `[CONFIRMADO]` — regla de un documento aprobado o decisión ya registrada.
- `[PROPUESTA]` — detalle candidato, no aprobado.
- `[PENDIENTE]` — decisión o evidencia que aún no existe; E4.9 ya está integrado.

---

## 1. Functionality

`[CONFIRMADO]` E4.10 permite **rectificar por la vía ordinaria el último ciclo cerrado
financieramente y generar otra foto** (roadmap). Solo es reabrible el cierre con el `Fin`
cronológicamente más reciente y sin otro ciclo posterior cerrado; la fecha de registro es
solo auditoría (SPEC27, DT3; P5). DT9 —la rectificación excepcional de ciclos antiguos— no
se habilita aquí.

La capacidad incluye:

1. comprobar que el cierre es el último y que no existe otro ciclo posterior cerrado;
2. reabrir el cierre con actor, UTC, motivo y auditoría, sin modificar la foto v1;
3. abrir una ventana de rectificación con T2/T3 y T1 según D2-B aprobada;
4. revalidar las dependencias posteriores en solo lectura, sin modificar su S0 ni su plan;
5. re-cerrar el ciclo creando una versión nueva con el contrato completo de foto;
6. conservar v1 y v2 consultables, con selección explícita de versión;
7. rechazar reaperturas no ordinarias, intentos de salto por API, dobles versiones y
   fallos atómicos;
8. auditar la cadena completa reapertura → correcciones → re-cierre.

No incluye: DT9, ciclos antiguos, restauración de backup como reapertura, agregados
trimestrales/anuales E4.11, recálculo retroactivo, valoración/resultado/patrimonio E4.3,
desarrollar Ventas E4.2 (su guarda T1 ya integrada en E4.9 se hereda, no se amplía),
conciliaciones E4.4, cambios de permisos, despliegue ni datos reales.

`[CONFIRMADO]` E4.9 integrado solo implementa el camino de v1: `confirmCierre` inserta
`version=1` y bloquea con `ALREADY_CLOSED`; no existe camino de re-cierre. `[PENDIENTE]`
E4.10 requiere que el contrato de E4.9 se extienda o que E4.10 aporte la operación de
re-cierre; el ownership se decide en el paquete DEV.

### 1.1 Contratos heredados de E4.9

| Contrato | Estado | Uso en E4.10 |
| --- | --- | --- |
| **v1 → v2** | `[CONFIRMADO]` DT4; `[PENDIENTE]` extensión de re-cierre de E4.10. | La reapertura no actualiza v1; el re-cierre crea una versión nueva. |
| **Inmutabilidad** | `[CONFIRMADO]` E4.9: cierre y foto no se actualizan ni se borran; triggers y QA APTO CON RESERVAS. | v1 y su foto quedan intactas; no hay `PATCH`/`DELETE`. |
| **Auditoría** | `[CONFIRMADO]` E4.9: actor/UTC/motivo/fingerprint, append-only y dos acciones; `[PENDIENTE]` extensión de acciones/campos de E4.10. | La reapertura exige evento propio y cadena v1→reapertura→v2. |
| **Fingerprint** | `[CONFIRMADO]` E4.9: huella propia; `financeRevision` no la sustituye; `[PENDIENTE]` composición de v2. | El re-cierre compara preflight y confirmación; no usa la huella técnica como foto. |
| **Fuera de orden** | `[CONFIRMADO]` AC-20; motivo y coherencia al mismo corte. | No se reutiliza por analogía: un cierre posterior bloquea la vía ordinaria. |
| **T1/T2/T3** | `[CONFIRMADO]` T1 bloquea, T2 audita, T3 se permite; `[APROBADO D2-B]` T1 en la ventana para Movimientos, Compras y Ventas; S0/`inicio`/`Fin` protegidos. | La ventana declara qué desbloquea. |
| **Endpoints, forma y versiones** | `[CONFIRMADO]` superficie E4.9 (estado, preflight, foto, cierre); `[APROBADO D5-A]` política funcional de versión vigente; `[PENDIENTE]` rutas, representación de reapertura y fingerprint de v2. | No se fijan rutas nuevas; la representación y el fingerprint siguen pendientes. |

---

## 2. Definitions

| Término | Definición |
| --- | --- |
| **Último cierre** | `[CONFIRMADO]` Ciclo cerrado con el `Fin` cronológicamente más reciente y sin otro ciclo posterior cerrado. La fecha de registro no otorga prioridad. |
| **Cierre posterior** | `[CONFIRMADO]` Cierre de otro ciclo cuyo `Fin` es posterior al del cierre considerado. Su existencia impide la reapertura ordinaria (E4.10-AC1). |
| **Reapertura** | `[PROPUESTA]` Transición auditada que habilita una ventana de rectificación sobre el último cierre. No modifica la foto v1 ni crea una foto nueva. |
| **Ventana de rectificación** | `[CONFIRMADO]` Intervalo entre la reapertura y el re-cierre o la cancelación. T1 según D2-B; T2/T3 confirmados. |
| **Rectificación** | `[CONFIRMADO]` Escritura T2/T3 y T1 dentro de la ventana según D2-B, con las guardas y la auditoría vigentes. |
| **Re-cierre** | `[CONFIRMADO]` Nuevo cierre del mismo ciclo que crea una versión de foto posterior sin alterar las anteriores (SPEC27, DT4). |
| **Versión vigente** | `[APROBADO D5-A]` Mientras el ciclo está reabierto y sin nueva versión, la última versión cerrada es consultable pero no se presenta como vigente sin advertencia. |
| **Dependencia posterior** | `[APROBADO D4]` S0/plan del ciclo siguiente, fotos, auxiliares, agregados E4.11 y precontrol; contradicción material bloquea; aviso solo si se acredita no bloqueante. No se amplía por analogía. |
| **Estado de cierre derivado** | `[PROPUESTA]` Estado observable `Cerrado(vN)` o `Reabierto(vN)`. E4.9 integrado solo persiste `Cerrado(v1)`; la representación de E4.10 sigue pendiente. |

---

## 3. Principles and invariants

1. **`[CONFIRMADO]` v1 es inmutable.** El cierre y su foto no se actualizan ni se borran;
   los triggers de inmutabilidad siguen activos. La reapertura no puede ser un `UPDATE` de
   `cierres.estado` ni de la foto.
2. **`[CONFIRMADO]` El re-cierre crea una versión nueva.** No pisa v1; todas las versiones
   son consultables y de retención permanente (SPEC27, DT4).
3. **`[PROPUESTA]` La reapertura no crea foto.** Una foto es evidencia de cierre, no de una
   intención de rectificar. Si el modelo de estados usa un número de versión de estado, no
   es una versión de foto.
4. **`[CONFIRMADO]` Atomicidad del re-cierre.** El re-cierre (cierre + foto + auditoría +
   intento) se ejecuta en una transacción única, como el cierre de E4.9. **`[PROPUESTA]`**
   La reapertura (evento + estado derivado + auditoría) usa el mismo patrón transaccional.
   Un fallo no deja estado parcial, foto a medias ni auditoría huérfana.
5. **`[CONFIRMADO]` Sin cierre posterior.** Si existe un cierre posterior, la reapertura
   ordinaria se rechaza con motivo. **`[APROBADO D1-A/D8]`** Si aparece durante la ventana,
   el re-cierre ordinario se bloquea; el cierre posterior no se altera. Con cambios
   materiales no se cancela: la única salida es recuperación extraordinaria documentada y
   aprobada por separado. Sin cierre posterior, cambios materiales → `vN+1` con foto
   completa y motivo.
6. **`[CONFIRMADO]` No se modifica automáticamente el S0 ni el plan de otro ciclo.**
   La revalidación es de solo lectura (E4.10-AC3).
7. **`[CONFIRMADO]` Auditoría append-only.** Toda transición material registra actor, UTC
   y motivo; no se actualiza ni se borra. **`[PROPUESTA]`** La cadena registra además
   versión de origen/destino, fingerprint y resultado.
8. **`[APROBADO D7-A+B+C]` Idempotencia y concurrencia.** Reintento idéntico seguro; payload o
   versión esperada distintos → conflicto; nunca dos versiones por reintento o carrera.
9. **`[CONFIRMADO]` DT6 es un gate separado.** La reapertura no es una restauración de
   backup; el cierre real —también el re-cierre real— exige evidencia DT6/T-BKP.
10. **`[CONFIRMADO]` DT9 queda fuera.** E4.10 no habilita ciclos antiguos ni crea una
    excepción por la puerta trasera.
11. **`[CONFIRMADO]` Seguridad heredada.** Se reutiliza la sesión MFA completa, Origin/CSRF
    y los límites de la API. **`[APROBADO D3-B+C]`** No se introducen roles nuevos y el
    actor se toma de la sesión, no del cliente.
12. **`[CONFIRMADO]` Foto no recalculada.** Consultar v1/v2 devuelve valores persistidos,
    no una composición desde el estado vivo (SPEC27 AC-14; E4.11-AC1).

---

## 4. State model

`[PROPUESTA]` El modelo lógico candidato distingue el estado del **ciclo** del estado de su
**cierre financiero**. E4.10 solo gobierna el segundo.

| Estado de cierre | Significado | Operaciones permitidas |
| --- | --- | --- |
| `SinCierre` | No existe cierre financiero. | Ninguna de E4.10; el cierre es E4.9. |
| `Cerrado(vN)` | Existe una versión cerrada vigente; N ≥ 1. | Consultar; reabrir solo si es el último cierre y N es la última versión. |
| `Reabierto(vN)` | Ventana de rectificación abierta sobre la última versión cerrada vN. | Corregir según D2; re-cerrar; cancelar según D8; consultar vN. |

Transiciones candidatas:

- `Cerrado(vN) → Reabierto(vN)` — reapertura auditada; no crea versión de foto.
- `Reabierto(vN) → Cerrado(vN+1)` — re-cierre auditado; crea una versión nueva.
- `Reabierto(vN) → Cerrado(vN)` — cancelación auditada D8: solo sin cambios materiales;
  con cambios y sin cierre posterior, `vN+1`; con cierre posterior, recuperación
  extraordinaria aprobada por separado.
- `SinCierre → Reabierto` — **prohibida**.
- `Cerrado(vN) → Cerrado(vN+1)` sin reapertura — **prohibida**.
- `Reabierto(vN) → Reabierto(vN)` — **prohibida** (una sola ventana activa; tras el
  re-cierre puede abrirse otra secuencial v3+).
- `Reabierto(vN) → Reabierto(vM)` con M ≠ N — **prohibida**.
- `Cerrado(vN) → Cerrado(vM)` con M ≤ N — **prohibida**.
- Borrar o actualizar una versión/foto — **prohibido**.

`[APROBADO D1-A/D5-A]` Reglas decididas:

- `Reabierto(vN)` reserva la posición de último cierre; una sola ventana.
- No se registran ni cierran cierres posteriores incompatibles durante la reserva.
- `v3+` solo secuencial sobre la última versión cerrada.
- Mientras el ciclo está reabierto, la última foto cerrada es consultable pero no vigente
  sin advertencia; los agregados nuevos excluyen y marcan `PendienteReCierre`; los ya
  generados quedan congelados; la mezcla de versiones exige composición exacta registrada.

`[PENDIENTE]` La representación persistida (evento append-only, tabla de
reaperturas, campo derivado o versión de estado) no se fija. La semántica observable sí:
existe una ventana, es auditable, v1 no cambia y el re-cierre crea una versión nueva.

---

## 5. Flow: reabrir → corregir → re-cerrar

`[PROPUESTA]` Salvo las reglas marcadas `[CONFIRMADO]`, el flujo siguiente es candidato.
La forma de materializar la reapertura no se fija aquí; el flujo describe la semántica
observable y se adapta a la representación que apruebe E4.10; E4.9 ya está integrado.

### 5.1 Reabrir

1. **Elegibilidad.** Leer el estado de cierre y la última versión; comprobar que el ciclo
   es el último cierre, que no existe otro ciclo posterior cerrado, que no hay una ventana
   abierta y que la versión es la última. Si falla, rechazar sin escribir.
2. **Confirmación.** Exigir motivo (D3), actor de sesión, UTC y versión/estado esperado
   (D7). Mostrar qué se podrá corregir y qué seguirá bloqueado.
3. **Transacción.** Registrar el evento de reapertura, el estado derivado y la auditoría.
   No se crea foto ni versión de foto; v1 permanece intacta.
4. **Respuesta.** Devolver el estado `Reabierto(vN)`, la versión de origen, la ventana y
   los límites de rectificación. Un reintento idéntico devuelve el mismo resultado.

`[PROPUESTA]` La reapertura no exige un backup nuevo: no destruye ni reescribe evidencia.
El re-cierre sí reutiliza el preflight de E4.9, incluida la evidencia de backup/DT6. Si el
usuario quiere una copia previa adicional, se añade como preflight, no como sustituto de
la atomicidad.

### 5.2 Corregir

- `[CONFIRMADO]` T2 se permite con impacto, motivo y auditoría; la foto v1 no se altera.
- `[CONFIRMADO]` T3 se permite; si la foto guarda versión del nombre, no se altera.
- `[APROBADO D2-B]` T1 se permite dentro de la ventana y del ciclo, con auditoría por
  escritura; S0, `inicio` y `Fin` siguen bloqueados.
- `[CONFIRMADO]` S0, `inicio` y `Fin` son identidad congelada: no se editan aunque D2
  habilite T1. No se recalcula la ventana ni se cambia el S0.
- `[CONFIRMADO]` Ninguna corrección desbloquea otros ciclos ni modifica su S0/plan.
- `[PROPUESTA]` Cada corrección conserva su propia auditoría; la ventana no sustituye la
  auditoría T2/T1 ya exigida por las rutas de escritura.

### 5.3 Previsualizar el re-cierre

Antes de re-cerrar, E4.10 muestra un preflight de solo lectura:

- estado, versión de origen y fingerprint de la vista previa;
- diferencias materiales frente a `vN` (plan, auxiliares, hechos, clasificación, inversión);
- resultado de la revalidación de dependencias posteriores (D4);
- bloqueos y avisos, sin totales provisionales;
- evidencia de backup/DT6 disponible.

`[CONFIRMADO]` Cambio entre la vista previa y la confirmación → conflicto; no se emite foto
parcial (patrón E4.9 AC-11).

### 5.4 Re-cerrar

1. **Comprobaciones.** La ventana sigue abierta; la versión esperada es la última; no
   apareció un cierre posterior; el preflight y la revalidación están vigentes; el motivo
   de re-cierre está presente (D3-B+C).
2. **Transacción.** Crear el cierre de versión `N+1`, la foto completa, la auditoría y el
   intento. La secuencia de versión es `MAX(version)+1`; v1 y las versiones anteriores no
   se tocan.
3. **Fallo.** Rollback total: no hay v2, no hay foto parcial, el ciclo sigue `Reabierto(vN)`
   y v1 sigue consultable. El reintento es posible.
4. **Respuesta.** Devolver la versión nueva, la foto y el vínculo con la versión de origen.
   El estado pasa a `Cerrado(vN+1)`.

### 5.5 Cancelar (D8 aprobada)

`[APROBADO D8]` La cancelación es una transición auditada `Reabierto(vN) → Cerrado(vN)` que
no crea foto **solo si se acredita ausencia de cambios materiales** desde la reapertura.
No basta la igualdad de importes: se comprueban hechos, relaciones, clasificación, plan y
componentes fotografiados. Ante incertidumbre, se bloquea.

- **Sin cambios materiales:** evento auditado con actor, UTC, motivo, versión de origen y
  resultado de la comparación; `vN` y anteriores intactas; T1 re-bloqueado.
- **Con cambios materiales y sin cierre posterior:** no se cancela sin nueva versión; se
  exige re-cierre `vN+1` con foto completa y motivo.
- **Con cambios materiales y cierre posterior:** el re-cierre ordinario `vN+1` queda
  bloqueado; no se altera el cierre posterior; la única salida es recuperación
  extraordinaria documentada y aprobada por separado. Sin cambios materiales se mantiene
  la cancelación sin foto descrita en el primer supuesto. No se cancela sin evidencia ni se
  descartan cambios en silencio.
- **Detección:** comparar contra `vN` (`v1` solo si `N=1`); si no se puede demostrar la
  ausencia de cambios, tratar como material (fail-closed).
- **Prohibido:** descartar cambios en silencio o presentar `Cerrado(vN)` como si la ventana
  no hubiera existido.

---

## 6. Data model and contracts

`[PROPUESTA]` Contratos conceptuales, sin DDL ni migración en este documento. La forma
exacta depende de la decisión de esquema de E4.10; E4.9 ya está integrado.

- **Evento de reapertura:** ciclo, versión de origen, actor, UTC, motivo, fingerprint o
  hash de la petición, versión/estado esperado, clave de intento, resultado y correlación.
- **Estado de cierre derivado:** ciclo, última versión cerrada, ventana abierta o cerrada,
  referencia al evento de reapertura vigente. No se materializa actualizando `cierres`.
- **Cierre re-cierrado:** ciclo, versión `N+1`, ventana congelada, S0 congelado, actor, UTC,
  motivo, fingerprint, estado y referencia a la foto.
- **Foto vN+1:** contrato completo de SPEC27; no un diff. La comparación con v1 es
  auditoría/UI, no una foto parcial.
- **Vínculo v1→v2:** versión de origen, evento de reapertura, versión de destino y
  correlación; consultable y append-only.
- **Intento/idempotencia:** clave, tipo de operación, hash del payload, resultado y
  referencia a la versión creada. Reapertura y re-cierre tienen espacios separados.
- **Metadatos inmutables:** versión de aplicación y de esquema, además de ciclo, versión de
  foto, fecha UTC, actor, motivo y fingerprint (SPEC27).

`[PENDIENTE]` No se fija:

- si la auditoría se extiende en `cierre_audit` o se crea una tabla de eventos; el CHECK
  actual solo admite `cierre` y `cierre_fuera_de_orden` y exige migración;
- si la reapertura usa una tabla propia o una versión de estado;
- si el fingerprint de v2 incluye la identidad de v1, el motivo de reapertura y el
  resultado de la revalidación. Candidato: la huella cubre el payload y la coherencia de
  v2; el vínculo y el motivo son metadatos separados, no sustitutos.

---

## 7. API behavior and external dependencies

`[PROPUESTA]` Contrato conceptual. **No se fijan rutas, métodos HTTP ni nombres de códigos
como contrato estable**. E4.9 ya está integrado; no se fijan rutas ni códigos de E4.10
hasta que se decidan.

| Operación conceptual | Entrada | Salida | Reglas |
| --- | --- | --- | --- |
| `estadoDeCierre(ciclo)` | Ciclo | Estado derivado, última versión, ventana, elegibilidad, bloqueos | Solo lectura; no recalcula la foto. |
| `versionesDeCierre(ciclo)` | Ciclo | Lista de versiones con metadatos, última cerrada y estado de reapertura | Todas las versiones existentes consultables; selección explícita. |
| `fotoDeCierre(ciclo, versión?)` | Ciclo, versión opcional | Foto persistida y metadatos | Sin versión: la última cerrada; no la vigente viva. |
| `reabrirUltimoCierre(ciclo, solicitud)` | Motivo, versión/estado esperado, clave de intento | Estado `Reabierto`, versión de origen, ventana | No crea foto; no modifica v1; atómica. |
| `reCerrarCiclo(ciclo, solicitud)` | Motivo de re-cierre (D3-B+C), versión esperada, fingerprint de preflight, clave de intento | Versión nueva, foto, vínculo v1→v2 | Crea una sola versión; fallo → rollback. |
| `cancelarReapertura(ciclo, solicitud)` | Motivo, versión esperada, clave de intento | Estado `Cerrado(vN)` | D8: sin foto solo sin cambios materiales; con cambios y sin cierre posterior, `vN+1`; con cierre posterior, re-cierre ordinario bloqueado y solo recuperación extraordinaria aprobada por separado. |

Reglas transversales:

- Reintento idéntico: misma respuesta y misma versión/foto; no duplica.
- Payload distinto con la misma clave: `IDEMPOTENCY_CONFLICT` (candidato 409).
- Cambio concurrente o versión esperada obsoleta: `IMPACT_CHANGED` /
  `REVISION_CONFLICT` / conflicto de versión (candidato 409), sin escritura.
- Reabrir un cierre no último o una versión histórica: rechazo motivado, sin estado
  parcial.
- Re-cerrar sin ventana abierta: rechazo; no se permite saltarse la reapertura.
- Consultar una versión inexistente: error explícito; no se devuelve la última por
  defecto si la petición pidió una versión concreta.
- La API no expone `PATCH`/`DELETE` de cierres, fotos ni versiones.
- Seguridad: sesión MFA completa, Origin/CSRF, límites de JSON y errores sin SQL; sin roles
  nuevos ni bypass (guías de seguridad).

`[PROPUESTA]` Errores candidatos, sin fijar nombres ni códigos HTTP como contrato estable:

| Código candidato | Condición | Familia |
| --- | --- | --- |
| `NO_ES_ULTIMO_CIERRE` | El ciclo no es el último cierre o se intenta reabrir una versión histórica. | Conflicto/validación |
| `CIERRE_POSTERIOR_EXISTENTE` | Existe otro ciclo posterior cerrado. | Conflicto |
| `CICLO_NO_CERRADO` | No hay cierre que reabrir. | Validación |
| `REAPERTURA_YA_ACTIVA` | Ya hay una ventana abierta para el ciclo. | Conflicto |
| `REAPERTURA_NO_ACTIVA` | Se intenta re-cerrar o cancelar sin ventana. | Conflicto |
| `VERSION_ESPERADA_OBSOLETA` | La versión/estado esperado no es el vigente. | Conflicto |
| `MOTIVO_REQUERIDO` | Falta el motivo exigido por D3 o no cumple el límite. | Validación |
| `IDEMPOTENCY_CONFLICT` | Misma clave de intento con payload distinto. | Conflicto (heredado) |
| `IMPACT_CHANGED` / `REVISION_CONFLICT` | Cambio concurrente entre vista previa y confirmación. | Conflicto (heredado) |
| `REVALIDACION_BLOQUEANTE` | Una dependencia posterior contradice la rectificación y D4 bloquea. | Conflicto |
| `VENTANA_RECTIFICACION_CERRADA` | Escritura T1/T2 fuera de la ventana. | Conflicto |
| `SIN_CAMBIOS` | Re-cierre sin cambios materiales acreditados; se rechaza y se usa D8 si procede. | Validación |
| `DT6_BLOQUEADO` / `E35_BLOQUEADO` | Falta evidencia de backup/restauración o E3.5 no es verificable. | Bloqueo |
| `DT9_NO_HABILITADO` | Intento de reabrir un ciclo antiguo. | Bloqueo/validación |
| `FOTO_NO_ENCONTRADA` | Se pide una versión inexistente. | No encontrado |

`[CONFIRMADO]` Sin servicios externos. El backup se verifica como preflight DT6/T-BKP; un
fixture no acredita DT6.

---

## 8. T1/T2/T3 during the rectification window

| Nivel | Mientras `Reabierto` | Auditoría | Límite |
| --- | --- | --- | --- |
| **T1** | `[APROBADO D2-B]` Permitido dentro de la ventana y del ciclo para Movimientos, Compras y Ventas (incluida Ventas E4.2); S0, `inicio` y `Fin` siempre bloqueados. | Impacto, motivo, actor, UTC y revisión por escritura. | No desbloquea otros ciclos. |
| **T2** | Permitido con impacto, motivo y auditoría; la foto v1 no se altera. | La ya exigida por la ruta T2, más correlación con la ventana. | No modifica v1; las vistas vivas se actualizan o se marcan. |
| **T3** | Permitido. | La vigente; si la foto guarda versión del nombre, no se altera. | No se usa para eludir T1/T2. |

`[CONFIRMADO]` Al re-cerrar, la ventana se cierra y T1 vuelve a bloquearse.
`[APROBADO D8]` La cancelación sin cambios materiales cierra la ventana sin foto; con
cambios materiales y sin cierre posterior exige `vN+1` con foto completa y motivo; con
cierre posterior, el re-cierre ordinario `vN+1` queda bloqueado, no se altera el cierre
posterior y solo cabe recuperación extraordinaria documentada y aprobada por separado.

---

## 9. Revalidation of later dependencies

`[CONFIRMADO]` E4.10-AC3 exige revalidar dependencias posteriores sin modificar
automáticamente su saldo inicial. La revalidación es de solo lectura y se registra.

`[APROBADO D4]` Matriz de revalidación (sin ampliar AC-20 por analogía): contradicción
material bloquea; aviso solo si se acredita no bloqueante; registrar valores comparados.

- S0 y plan del ciclo siguiente: comprobar que la rectificación no los invalida; no
  recalcularlos ni cambiarlos.
- Fotos y versiones de ciclos posteriores: si existieran, la vía ordinaria ya se habría
  rechazado (AC1); si aparecen por carrera, se detiene el re-cierre.
- Auxiliares y agregados E4.11: comprobar la referencia a la versión usada; no
  recalcularlos.
- Precontrol/histórico E4.5: solo lectura; no se transforma en foto ni en hecho.

`[PROPUESTA]` Una contradicción que haga incoherente la cadena **bloquea**; un aviso solo
se admite para diferencias declaradas no bloqueantes y queda auditado. La alternativa C de
D4 (avisar sin bloquear) no se adopta por defecto. No se modifica ningún S0/plan ajeno, ni
siquiera para «cuadrar» la rectificación.

`[CONFIRMADO]` Si existe un cierre posterior, no se aplica la comprobación de AC-20 como
sustituto: la reapertura ordinaria se rechaza (AC1). AC-20 pertenece al cierre fuera de
orden de E4.9, no a E4.10.

---

## 10. Audit

`[CONFIRMADO]` Actor, UTC, motivo y fingerprint forman parte de la identidad del cierre; la
auditoría es append-only. `[PENDIENTE]` Las acciones, campos y soporte concreto de la
auditoría de reapertura de E4.10 no se congelan; E4.9 ya está integrado y `cierre_audit`
solo admite `cierre` y `cierre_fuera_de_orden`. **`[PROPUESTA]`** La reapertura debe ser
reconstruible sin depender de la foto.

`[PROPUESTA]` Cada evento registra, como mínimo:

- tipo de evento: reapertura, re-cierre o cancelación; correlación con las correcciones
  T1/T2, que conservan su propia auditoría;
- ciclo y versión de origen/destino;
- actor de sesión, UTC y motivo;
- versión/estado esperado y observado;
- fingerprint o hash de la petición y fingerprint de la foto en el re-cierre;
- clave de intento y correlación con la ventana;
- resultado (éxito/fallo) y, si aplica, valores comparados de la revalidación;
- versión de aplicación y de esquema.

`[CONFIRMADO]` La cadena `v1 → reapertura → correcciones → v2` debe ser consultable y no
tener huecos ni eventos huérfanos. Un fallo de auditoría revierte la transacción.

`[PENDIENTE]` Se decide en el paquete DEV si se extiende
`cierre_audit` con nuevas acciones/campos o se crea una tabla de eventos. Cualquier opción
exige migración y actualizar el contrato de esquema; no se asume que la tabla actual sirva
tal cual. Los motivos no se publican como secretos ni se usan para almacenar credenciales.

---

## 11. Photo protection and version policy

`[CONFIRMADO]` v1 y su foto son inmutables; no se actualizan ni se borran. El re-cierre
crea v2 sin alterar v1; todas las versiones son consultables; la retención es permanente
(SPEC27, DT4). La foto no se recalcula desde el estado vivo (AC-14).
`[APROBADO D5-A]` La política de versión vigente está decidida: v1 consultable pero no
vigente sin advertencia; agregados nuevos excluyen y marcan `PendienteReCierre`; ya
generados congelados; mezcla con composición exacta. Quedan pendientes la representación
persistida, el fingerprint de v2 y los detalles no decididos de SPEC29 P2/P3/P6/P7/P8.

Reglas candidatas:

1. `[PROPUESTA]` La reapertura no crea ni modifica una foto.
2. `[CONFIRMADO]` v2 repite el contrato completo de foto, no solo los bloques afectados
   (SPEC27); la comparación con v1 es un artefacto de auditoría/UI.
3. `[CONFIRMADO]` v2 conserva la ventana y el S0 congelados de v1; la rectificación no los
   recalcula (SPEC27, DT3).
4. `[PROPUESTA]` Si una fuente deja de estar disponible, v2 la declara `No disponible` con
   motivo; no copia v1 como si fuera el estado actual.
5. `[CONFIRMADO]` Ninguna consulta de v1/v2 devuelve valores recalculados ni mezcla la
   vista viva con la foto.
6. `[APROBADO D5-A]` Mientras el ciclo está reabierto, la última versión cerrada sigue
   consultable pero no se presenta como vigente sin advertencia; los agregados nuevos
   excluyen el ciclo y lo marcan `PendienteReCierre`; los ya generados quedan congelados;
   v3+ solo secuencial sobre la última versión.
7. `[PENDIENTE]` La inclusión de la identidad de v1 y del motivo de
   reapertura en el fingerprint de v2 no se fija; el vínculo no depende solo del hash.

---

## 12. Screens and interfaces

`[PROPUESTA]` Contrato de UI; **no hay wireframes aprobados ni capturas**. La revisión
visual es un gate separado y no se declara PASS.

- **Elegibilidad:** el último cierre muestra la acción «Reabrir»; un cierre no último
  explica por qué no es reabrible y no ofrece la acción.
- **Confirmación de reapertura:** motivo, consecuencias, alcance de rectificación, versión
  que se conserva y advertencia de que v1 no cambia.
- **Estado reabierto:** banda/estado visible, versión de origen, ventana, qué está
  permitido y qué sigue bloqueado; acceso a v1.
- **Rectificación:** las rutas T2/T1 muestran su impacto y auditoría; no se presenta una
  vista viva como si fuera la foto.
- **Preparación del re-cierre:** resumen de diferencias frente a `vN`, bloqueos/avisos,
  evidencia de backup y confirmación con motivo/idempotencia.
- **Resultado:** v2 creada, enlace a v1 y v2, comparación lado a lado, sin totales
  provisionales.
- **Errores:** cierre posterior, versión obsoleta, ventana cerrada, conflicto de
  idempotencia, fallo atómico, DT6, sesión expirada; siempre con motivo y sin estado
  parcial.
- **Vacío/carga:** no se muestra `0` por ausencia; la carga conserva ciclo y versión.

`[CONFIRMADO]` La UI no declara completo un total parcial ni convierte una ausencia en
cero. La consulta de v1/v2 es explícita y etiquetada.

---

## 13. Empty, loading and error states

- **Sin cierre:** no hay reapertura; se explica que el cierre es E4.9.
- **Reabierto sin correcciones:** la ventana sigue abierta; el re-cierre se rige por la
  decisión pendiente sobre `SIN_CAMBIOS` (no se inventa aquí).
- **Carga:** conserva ciclo, versión y filtros; no muestra totales provisionales.
- **Error:** no hay v2 ni foto parcial; se declara el fallo y se permite reintento
  idempotente. El ciclo permanece `Reabierto(vN)` si falló el re-cierre.
- **Bloqueado:** cierre posterior, versión obsoleta, DT6, revalidación, ventana cerrada;
  no se escribe.
- **Sesión expirada:** conserva contexto; exige reautenticación; no reutiliza una clave de
  intento de otra sesión sin validación.

---

## 14. Validation and edge cases

- Reabrir un ciclo sin cierre, un cierre no último o una versión histórica → rechazo
  motivado; sin estado parcial (AC04/AC14).
- Reabrir un cierre con otro ciclo posterior cerrado → rechazo (AC01).
- Reabrir con una ventana ya abierta → rechazo; no hay dos ventanas (AC12).
- Reabrir con versión/estado esperado obsoleto → conflicto; no se aplica a ciegas (AC12).
- Re-cerrar sin reapertura, o reabrir y re-cerrar en una sola operación saltándose la
  ventana → rechazo (AC14).
- Intento de `PATCH`/`DELETE` sobre v1, su foto o una versión → rechazo; triggers activos
  (AC07/AC14).
- Fallo en la transacción de reapertura o re-cierre → rollback; sin evento/foto huérfanos
  (AC05/AC13).
- Cierre posterior que aparece entre reapertura y re-cierre → re-cierre detenido; la
  ventana se resuelve por D8: re-cierre ordinario bloqueado; recuperación extraordinaria
  aprobada por separado (AC16).
- Dependencia posterior contradictoria → contradicción material bloquea; aviso solo si se
  acredita no bloqueante; sin cambios automáticos de S0/plan (AC17).
- `SinPlan` → válido; v2 lo captura; no se inventan líneas. `PlanNoVerificable` → bloqueo
  (AC19).
- Auxiliar sin hechos o fuente no disponible → `No disponible` con motivo; no se copia v1
  como actual (AC19).
- Ciclo sin hechos → la foto de E4.9 ya lo captura; E4.10 no lo reinterpreta (AC19).
- Re-cierre sin cambios → `[APROBADO SIN_CAMBIOS]` se rechaza con resultado explícito
  `SIN_CAMBIOS`; no crea foto; cancelación D8 solo con ausencia de cambios acreditada; no
  basta igualdad de importes/totales.
- Reabrir después de v2 (v3) → `[APROBADO D1-A/D5-A]` secuencial sobre la última versión
  cerrada; nunca se ramifica la historia.
- Reapertura tras cancelación → `[PROPUESTA]` consecuencia de D1-A: no hay ventana activa
  tras cancelar; una nueva reapertura secuencial queda sujeta a D1-A y no se infiere de D8.
- DT6 sin evidencia o restauración no probada → re-cierre real bloqueado; fixtures se
  marcan sintéticos (AC15).
- DT9, ciclo antiguo o restore de backup → rechazo; no hay ruta alternativa (AC22).
- Cambio de versión de esquema/aplicación entre vista previa y confirmación → conflicto;
  no se emite v2 (patrón E4.9).
- Permisos: sin rol nuevo por defecto (D3); una sesión sin MFA completa no reabre ni
  re-cierra.
- Consulta de v1 durante la reapertura → valores persistidos, no recalculados (AC20).

---

## 15. Limits and exclusions

- **DT9 fuera:** no se habilita la rectificación excepcional de ciclos antiguos ni su
  efecto en fotos trimestrales/anuales o cierres posteriores. Exige SPEC propia y
  aprobación explícita.
- **Restore no es reapertura:** restaurar un backup no reabre un ciclo; rebobina identidad
  y auditoría. DT6 es un gate independiente.
- **Gates heredados de E4.9:** E3.5 está integrado, pero **E3.5-AC-15** sigue PARCIAL;
  **sin E3.5/FIN_NETA verificable no hay re-cierre ni foto**; DT6 bloquea el cierre real.
  E4.3/E4.2/E4.4 no disponibles se capturan como `No disponible` con motivo si el cierre
  está autorizado; no se declaran capturados.
- **No se reabren M1–M6, DT3 ni DT4:** se aplican; esta SPEC no los reinterpreta.
- **No se corrige automáticamente un cierre posterior** ni se recalcula su S0/plan.
- **No se recalculan fotos, agregados ni precontrol** desde el estado vivo.
- **No se implementan agregados E4.11** ni se decide qué versión compone un trimestre/año.
- **No se amplía** E4.3, E4.2 o E4.4 más allá de lo que la foto capture.
- **No se crean roles/permisos nuevos por defecto (D3)**, ni se cambia la autenticación.
- **No hay código, DDL, migración, endpoints definitivos ni wireframes aprobados** en este
  documento.
- **No se usan datos reales**; fixtures sintéticos para DEV/QA.
- **No se declara PASS** por diseño documental.

---

## 16. Acceptance checks (candidate, no PASS)

Todos son candidatos no aprobados y quedan **UNRUN**. Los tres primeros trazan el roadmap
E4.10-AC1/AC2/AC3; el resto son candidatos de esta spec. Las filas condicionadas no pueden
aprobarse hasta resolver la decisión indicada.

| ID | Acción / precondiciones | Resultado esperado | Depende |
| --- | --- | --- | --- |
| E4.10-AC01 | Reabrir por la vía ordinaria un cierre con otro ciclo posterior cerrado. | Rechazo motivado; sin cambio de estado, sin evento de reapertura y sin tocar el cierre posterior. | `[CONFIRMADO]` roadmap AC1 |
| E4.10-AC02 | Cerrar (v1) → reabrir → corregir → re-cerrar. | v1 intacta y consultable; v2 creada con fecha, motivo, actor, fingerprint, versión de app/esquema y vínculo v1→v2. | `[CONFIRMADO]` roadmap AC2 / DT4; `[PROPUESTA]` vínculo |
| E4.10-AC03 | Reabrir/re-cerrar con dependencias posteriores existentes. | Revalidación de solo lectura; su S0/plan no se modifica automáticamente; evidencia registrada. | `[CONFIRMADO]` roadmap AC3 |
| E4.10-AC04 | Intentar reabrir un cierre no último o una versión histórica distinta de la última. | Rechazo `NO_ES_ULTIMO_CIERRE`/equivalente; DT9 no habilitado; sin estado parcial. | `[CONFIRMADO]` P5/DT9; `[APROBADO D1-A]` rechazo de versión histórica |
| E4.10-AC05 | Fallo inducido dentro de la transacción de reapertura. | Rollback total; el cierre sigue `Cerrado(vN)`; sin evento ni auditoría huérfana. | `[PROPUESTA]` atomicidad de reapertura pendiente |
| E4.10-AC06 | Reabrir con motivo, actor y UTC; consultar después. | Estado `Reabierto(vN)`; motivos separados reapertura/re-cierre, actor de sesión/UTC y trazabilidad en auditoría/versión; no se crea foto. | `[APROBADO D3-B+C]` |
| E4.10-AC07 | Consultar y intentar modificar v1/foto mientras el ciclo está reabierto. | v1 y foto intactas; consulta devuelve valores persistidos; `PATCH`/`DELETE` rechazados. | `[CONFIRMADO]` inmutabilidad |
| E4.10-AC08 | Reclasificar un hecho T2 dentro de la ventana. | Impacto, motivo y auditoría; v1 intacta; vista viva actualizada o marcada. | `[CONFIRMADO]` T2 |
| E4.10-AC09 | Escritura T1 dentro/fuera de la ventana. | Dentro: permitida solo en ventana/ciclo, con impacto/auditoría; S0/`inicio`/`Fin` siempre bloqueados. Fuera: `HISTORY_LOCKED`. | `[APROBADO D2-B]` |
| E4.10-AC10 | Re-cerrar tras corregir. | Exactamente una versión nueva `N+1` con el contrato completo de foto; `vN` y anteriores intactas; vínculo consultable. | `[CONFIRMADO]` DT4; `[APROBADO D1-A]` secuencial |
| E4.10-AC11 | Repetir reapertura/re-cierre con la misma clave y payload; luego con payload distinto. | Reintento idéntico devuelve el mismo resultado/versión; payload distinto → conflicto de idempotencia; sin duplicados. | `[CONFIRMADO]` patrón E4.9 |
| E4.10-AC12 | Dos reaperturas o dos re-cierres concurrentes; versión esperada obsoleta. | Solo una operación gana; la otra recibe conflicto; no se crean dos versiones ni dos ventanas. | `[APROBADO D7-A+B+C]` |
| E4.10-AC13 | Fallo inducido en la transacción de re-cierre. | Rollback total; sin v2 ni foto parcial; el ciclo sigue `Reabierto(vN)`; v1 consultable; reintento posible. | `[CONFIRMADO]` atomicidad |
| E4.10-AC14 | Intentar saltarse la restricción por API: re-cerrar sin reabrir, reabrir un no último, escribir v1, reabrir una versión histórica, omitir versión esperada. | Todas las rutas rechazan con motivo; sin cambio de estado ni escritura. | `[PROPUESTA]` |
| E4.10-AC15 | Re-cerrar sin preflight/backup verificable, sin restauración DT6 o sin E3.5/FIN_NETA verificable. | Bloqueo antes de escribir; sin v2; fixtures marcados sintéticos; cierre real solo con DT6 y E3.5 verificable. | `[CONFIRMADO]` DT6 / E3.5 |
| E4.10-AC16 | Crear un cierre posterior entre la reapertura y el re-cierre. | El re-cierre ordinario se bloquea con error motivado; no hay v2 silenciosa; el cierre posterior no se altera. Con cambios materiales no se cancela: la única salida es recuperación extraordinaria documentada y aprobada por separado. Sin cierre posterior, cambios materiales → `vN+1` con foto completa y motivo. | `[APROBADO D1-A/D8]` |
| E4.10-AC17 | Dependencia posterior contradictoria en la revalidación. | Contradicción material bloquea; aviso solo si se acredita no bloqueante; valores comparados auditados; ningún S0/plan ajeno modificado. | `[APROBADO D4]` |
| E4.10-AC18 | Recorrer la cadena v1 → reapertura → correcciones → v2. | Auditoría completa, append-only y consultable; actor/UTC/motivo/versiones/fingerprint; sin huecos ni eventos huérfanos. | `[CONFIRMADO]` auditoría |
| E4.10-AC19 | Reabrir y re-cerrar con plan `SinPlan`/capturado y auxiliares disponibles o no. | Plan vivo rectificable; `SinPlan`↔`Capturado` con motivo/auditoría; foto completa y comparación con `vN`; auxiliares de fuentes vigentes; ausente → `No disponible` con motivo; sin copiar valores antiguos. | `[APROBADO D6-A+C]` |
| E4.10-AC20 | Consultar `vN` y `vN+1` tras el re-cierre, con y sin versión explícita. | Devuelve valores persistidos, versión seleccionada, última cerrada y estado de reapertura; sin recálculo ni `0` por ausencia. | `[CONFIRMADO]` foto/AC-14; `[APROBADO D5-A]` v1 consultable, no vigente sin advertencia |
| E4.10-AC21 | Cancelar una reapertura. | Sin cambios materiales: `Cerrado(vN)` sin foto, evento auditado, `vN`/anteriores intactas, T1 re-bloqueado. Con cambios y sin cierre posterior: `vN+1`. Con cierre posterior: re-cierre ordinario bloqueado; solo recuperación extraordinaria aprobada por separado. | `[APROBADO D8]` |
| E4.10-AC22 | Intentar reabrir un ciclo antiguo o usar restore de backup como reapertura. | Rechazo; no hay ruta alternativa; motivo auditado; DT9/DT6 no se confunden con E4.10. | `[CONFIRMADO]` P5/DT9/DT6 |
| E4.10-AC23 | Reabrir tras v2 (v3). | Secuencial sobre la última versión cerrada; no se reabre una versión histórica; una sola ventana activa; v3+ crea foto completa. | `[APROBADO D1-A/D5-A]` |
| E4.10-AC24 | Re-cerrar sin cambios materiales. | Rechazo explícito `SIN_CAMBIOS`; no crea foto; cancelación D8 solo con ausencia acreditada; no basta igualdad de importes/totales; con cambios revertidos o evidencia insuficiente no hay equivalencia ni cancelación automática. | `[APROBADO SIN_CAMBIOS]` |

`[APROBADO SIN_CAMBIOS]` «Re-cierre sin cambios» tiene AC24 y §19; «reabrir tras v2»
tiene AC23. Ambos siguen `UNRUN`; no se declaran PASS ni exclusiones por inferencia.

---

## 17. Traceability

| Fuente | Regla | AC candidatos |
| --- | --- | --- |
| Roadmap E4.10-AC1 | Rechazar reapertura con cierre posterior. | AC01, AC16 |
| Roadmap E4.10-AC2 | v1 inmutable y v2 con fecha/motivo. | AC02, AC07, AC10 |
| Roadmap E4.10-AC3 | Revalidar sin modificar S0. | AC03, AC17 |
| SPEC27 DT3/DT4 | Último cierre, v1/v2, retención, foto completa. | AC02, AC04, AC07, AC10, AC20 |
| SPEC27 AC-03/AC-04 | T1 `HISTORY_LOCKED` y cambio de fecha. | AC09 |
| SPEC27 AC-05/AC-14 | T2 con auditoría; foto no recalculada. | AC08, AC20 |
| SPEC27 AC-10/AC-11 | Idempotencia y concurrencia. | AC11, AC12 |
| SPEC27 AC-12 | Rollback atómico. | AC05, AC13 |
| SPEC27 AC-20 | Cierre fuera de orden (no se reutiliza por analogía). | AC01, AC16 |
| SPEC27 DT6/T-BKP | Backup y restauración probados. | AC15 |
| Roadmap P5/DT9 | Solo último reabrible; DT9 fuera. | AC04, AC22 |
| Aprobación 2026-11-05 | D1-A, D2-B, D8 y D9-A; texto en §18. | AC09, AC10, AC16, AC21, AC22 |
| Aprobación 2026-11-05 | D3-B+C, D4, D6-A+C y D7-A+B+C; texto en §19. | AC06, AC11, AC12, AC17, AC19 |
| Aprobación 2026-11-05 | `SIN_CAMBIOS`: rechazo sin foto, D8 si procede. | AC24 |
| Aprobación 2026-11-05 + SPEC29 | D5-A con P1-C/P4-A/P5-B; agregados y versiones. | AC20; SPEC29 AC03/AC05/AC06 |
| E4.11 (scope) | Versión vigente y agregados. | AC20; D5 |

---

## 18. Decisiones: estado tras la aprobación del 2026-11-05

| Decisión | Estado | Efecto |
| --- | --- | --- |
| **D1-A** | **Aprobada** | Una reapertura activa; reserva del último cierre; v3+ secuencial; no se registran/cierran cierres posteriores incompatibles durante la ventana. |
| **D2-B** | **Aprobada** | T1 solo en la ventana/ciclo para Movimientos, Compras y Ventas; S0/`inicio`/`Fin` y otros ciclos protegidos. |
| **D3-B+C** | **Aprobada** | Motivo separado en reapertura/re-cierre; 1000 caracteres; actor de sesión; sin roles nuevos; trazabilidad en auditoría y versión. |
| **D4** | **Aprobada** | Revalidación de solo lectura de S0/plan, fotos, auxiliares, agregados y precontrol; contradicción material bloquea; aviso solo si se acredita no bloqueante; sin modificar S0/planes ajenos. |
| **D5-A** | **Aprobada** | v1 consultable pero no vigente sin advertencia; agregados nuevos excluyen y marcan `PendienteReCierre`; ya generados congelados; mezcla de versiones con composición exacta. Coordinada con SPEC29 P1-C/P4-A/P5-B. |
| **D6-A+C** | **Aprobada** | Plan vivo rectificable; `SinPlan`/`Capturado` con motivo y auditoría; foto completa y comparación con `vN`; auxiliares de fuentes vigentes, sin inventar ni copiar valores antiguos. |
| **D7-A+B+C** | **Aprobada** | Idempotencia separada; versión/estado esperado; transacción atómica; reintentos seguros; conflictos concurrentes; nunca duplicar ventanas ni fotos. |
| **D8** | **Aprobada** | Cancelación sin foto solo sin cambios materiales; con cambios y sin cierre posterior, `vN+1`; con cierre posterior, re-cierre ordinario bloqueado y solo recuperación extraordinaria aprobada por separado; detección fail-closed contra `vN`. |
| **D9-A** | **Aprobada** | Solo último cierre; DT9 fuera. |
| **SIN_CAMBIOS** | **Aprobada** | Rechazo explícito `SIN_CAMBIOS`; cancelación D8 si procede y ausencia acreditada; no basta igualdad de importes/totales; sin equivalencia ni cancelación automática si hubo cambios revertidos o falta evidencia. |
| SPEC29 P2/P3/P6/P7/P8 | Pendientes | No se convierten en decisiones por inferencia. |

**Trazabilidad:** D1 → §4, §5, AC10/AC16/AC23; D2 → §8, AC09; D3 → §5.1/§5.4, AC06;
D4 → §9, AC17; D5 → §11, AC20 y SPEC29 P1-C/P4-A/P5-B; D6 → §5.3/§5.4, AC19;
D7 → AC11/AC12; D8 → §5.5, AC16/AC21; D9 → AC04/AC22; SIN_CAMBIOS → AC24.

**No se decide aquí:** la forma definitiva de reapertura (evento, tabla, estado o versión),
las rutas canónicas, la tabla de auditoría, la inclusión exacta en el fingerprint de v2 y
las decisiones P2/P3/P6/P7/P8 de SPEC29. Aprobar esta SPEC no autoriza DEV ni merge.

## 19. Decisiones aprobadas D3/D4/D6/D7 y SIN_CAMBIOS

`[APROBADO 2026-11-05]` Decisiones de documentación; la implementación sigue pendiente y no
autoriza DEV.

**D3 — B+C.** Motivo obligatorio y separado en reapertura («por qué») y re-cierre («qué se
rectificó»), máximo 1000 caracteres, trim y sin mínimo inventado; actor de sesión, sin roles
nuevos; trazabilidad en auditoría y versión. El motivo no sustituye el fingerprint.

**D4 — bloqueo y revalidación de solo lectura.** Revalidar S0/plan del ciclo siguiente,
fotografías, auxiliares, agregados y precontrol. Una contradicción material bloquea; un
aviso solo se muestra si se acredita no bloqueante; se registran valores comparados. Nunca
se modifican automáticamente S0 ni planes ajenos.

**D6 — A+C.** Plan vivo rectificable; `SinPlan`↔`Capturado` con motivo y auditoría; nueva
fotografía completa y comparación con `vN`; auxiliares desde fuentes vigentes, sin inventar
datos ni copiar valores antiguos como actuales. Se respetan los gates de fuentes
obligatorias.

**D7 — A+B+C.** Idempotencia separada por operación; versión/estado esperado obligatorio;
transacción atómica por ciclo; reintentos seguros; conflictos ante cambios concurrentes;
nunca se duplican ventanas ni fotografías.

**SIN_CAMBIOS.** No se crea una nueva fotografía si no hay cambios materiales acreditados:
el re-cierre sin cambios se rechaza con resultado explícito `SIN_CAMBIOS`; se usa la
cancelación auditada de D8 cuando proceda y se haya verificado la ausencia de cambios. No
basta la igualdad de importes o totales. Si hubo cambios revertidos o falta evidencia, no se
asume equivalencia ni se permite cancelación automática. Los escenarios positivos y
negativos están en el testplan; los AC siguen `UNRUN`.
