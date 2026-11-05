# 28 — E4.10 Reabrir el último cierre y volver a cerrar: Specification

**DRAFT — no aprobada; no autoriza DEV ni merge.**
Status: **DRAFT documental.** Sin aprobación del usuario, sin AC en PASS, sin DEV, sin
migración, sin datos reales y sin merge. Las decisiones D1–D9 siguen abiertas en el
[brainstorming](28-e410-reapertura-brainstorming.md); este documento propone un contrato
candidato y marca lo que no puede fijarse. Esta revisión solo reconcilia referencias con
E4.9; no introduce decisiones funcionales.

Task ID: `E4.10 · SPEC` (canonical), soporte documental `SPEC28`.
Base de esta revisión: `main` **`3842831`** (2026-11-05). E4.9 está **integrado** en
`0176ffc` (#200), con QA **APTO CON RESERVAS** y CI post-merge `42000330143`; `a806fd9`
es E4.5 (#216), no E4.9. Los AC de E4.10 siguen **UNRUN**; los PASS de fixtures/parciales
de E4.9 no son PASS de aceptación. DT6/T-BKP sigue abierto. v25 está ocupada por E4.9:
E4.10 no reserva versión en esta SPEC.

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
3. abrir una ventana de rectificación cuyo alcance T1/T2/T3 se decide en D2;
4. revalidar las dependencias posteriores en solo lectura, sin modificar su S0 ni su plan;
5. re-cerrar el ciclo creando una versión nueva con el contrato completo de foto;
6. conservar v1 y v2 consultables, con selección explícita de versión;
7. rechazar reaperturas no ordinarias, intentos de salto por API, dobles versiones y
   fallos atómicos;
8. auditar la cadena completa reapertura → correcciones → re-cierre.

No incluye: DT9, ciclos antiguos, restauración de backup como reapertura, agregados
trimestrales/anuales E4.11, recálculo retroactivo, valoración/resultado/patrimonio E4.3,
Ventas E4.2, conciliaciones E4.4, cambios de permisos, despliegue ni datos reales.

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
| **T1/T2/T3** | `[CONFIRMADO]` T1 bloquea, T2 audita, T3 se permite; `[PENDIENTE D2]` alcance T1 en la ventana. | La ventana declara qué desbloquea; no se presupone T1. |
| **Endpoints, forma y versiones** | `[CONFIRMADO]` superficie E4.9 (estado, preflight, foto, cierre); `[PENDIENTE]` rutas, representación de reapertura y política de versiones de E4.10. | No se fijan rutas nuevas ni la política definitiva de versiones. |

---

## 2. Definitions

| Término | Definición |
| --- | --- |
| **Último cierre** | `[CONFIRMADO]` Ciclo cerrado con el `Fin` cronológicamente más reciente y sin otro ciclo posterior cerrado. La fecha de registro no otorga prioridad. |
| **Cierre posterior** | `[CONFIRMADO]` Cierre de otro ciclo cuyo `Fin` es posterior al del cierre considerado. Su existencia impide la reapertura ordinaria (E4.10-AC1). |
| **Reapertura** | `[PROPUESTA]` Transición auditada que habilita una ventana de rectificación sobre el último cierre. No modifica la foto v1 ni crea una foto nueva. |
| **Ventana de rectificación** | `[PROPUESTA]` Intervalo entre la reapertura y el re-cierre o la cancelación. Su alcance T1/T2/T3 depende de D2. |
| **Rectificación** | `[PROPUESTA]` Escritura T2/T3 —y T1 solo si D2 la habilita— realizada dentro de la ventana, con las guardas y la auditoría vigentes. |
| **Re-cierre** | `[CONFIRMADO]` Nuevo cierre del mismo ciclo que crea una versión de foto posterior sin alterar las anteriores (SPEC27, DT4). |
| **Versión vigente** | `[PENDIENTE]` Mientras el ciclo está reabierto y sin nueva versión, la candidata es la última versión cerrada; la regla definitiva depende de D5/E4.11. |
| **Dependencia posterior** | `[PENDIENTE D4]` S0/plan del ciclo siguiente, fotos, auxiliares, agregados E4.11 y precontrol, según la matriz que se apruebe. No se amplía por analogía. |
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
   ordinaria se rechaza con motivo. **`[PROPUESTA]`** Si aparece durante la ventana, el
   re-cierre se detiene y la ventana se resuelve según D8.
6. **`[CONFIRMADO]` No se modifica automáticamente el S0 ni el plan de otro ciclo.**
   La revalidación es de solo lectura (E4.10-AC3).
7. **`[CONFIRMADO]` Auditoría append-only.** Toda transición material registra actor, UTC
   y motivo; no se actualiza ni se borra. **`[PROPUESTA]`** La cadena registra además
   versión de origen/destino, fingerprint y resultado.
8. **`[PROPUESTA]` Idempotencia y concurrencia.** Reintento idéntico seguro; payload o
   versión esperada distintos → conflicto; nunca dos versiones por reintento o carrera.
9. **`[CONFIRMADO]` DT6 es un gate separado.** La reapertura no es una restauración de
   backup; el cierre real —también el re-cierre real— exige evidencia DT6/T-BKP.
10. **`[CONFIRMADO]` DT9 queda fuera.** E4.10 no habilita ciclos antiguos ni crea una
    excepción por la puerta trasera.
11. **`[CONFIRMADO]` Seguridad heredada.** Se reutiliza la sesión MFA completa, Origin/CSRF
    y los límites de la API. **`[PROPUESTA]`** No se introducen roles nuevos y el actor se
    toma de la sesión, no del cliente; la identidad del actor queda sujeta a D3.
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
| `Reabierto(vN)` | Ventana de rectificación abierta sobre la última versión cerrada vN. | Corregir según D2; re-cerrar; cancelar si D8-B; consultar vN. |

Transiciones candidatas:

- `Cerrado(vN) → Reabierto(vN)` — reapertura auditada; no crea versión de foto.
- `Reabierto(vN) → Cerrado(vN+1)` — re-cierre auditado; crea una versión nueva.
- `Reabierto(vN) → Cerrado(vN)` — cancelación auditada, solo si D8-B; no crea foto.
- `SinCierre → Reabierto` — **prohibida**.
- `Cerrado(vN) → Cerrado(vN+1)` sin reapertura — **prohibida**.
- `Reabierto(vN) → Reabierto(vN)` — **prohibida** (una sola ventana por ciclo y vez).
- `Reabierto(vN) → Reabierto(vM)` con M ≠ N — **prohibida**.
- `Cerrado(vN) → Cerrado(vM)` con M ≤ N — **prohibida**.
- Borrar o actualizar una versión/foto — **prohibido**.

`[PENDIENTE D1/D5]` No se decide aquí:

- si `Reabierto(vN)` sigue reservando la posición de «último»;
- si después de `Cerrado(vN+1)` se permite otra reapertura para `vN+2`;
- si una versión histórica distinta de la última puede reabrirse (candidato: **no**, porque
  ramificaría la historia);
- si la reapertura consume un número de versión de estado.

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
- `[PENDIENTE D2]` T1 se permite solo si el usuario lo aprueba; en tal caso, solo dentro
  de la ventana y del ciclo, con auditoría por escritura.
- `[CONFIRMADO]` S0, `inicio` y `Fin` son identidad congelada: no se editan aunque D2
  habilite T1. No se recalcula la ventana ni se cambia el S0.
- `[CONFIRMADO]` Ninguna corrección desbloquea otros ciclos ni modifica su S0/plan.
- `[PROPUESTA]` Cada corrección conserva su propia auditoría; la ventana no sustituye la
  auditoría T2/T1 ya exigida por las rutas de escritura.

### 5.3 Previsualizar el re-cierre

Antes de re-cerrar, E4.10 muestra un preflight de solo lectura:

- estado, versión de origen y fingerprint de la vista previa;
- diferencias materiales frente a v1 (plan, auxiliares, hechos, clasificación, inversión);
- resultado de la revalidación de dependencias posteriores (D4);
- bloqueos y avisos, sin totales provisionales;
- evidencia de backup/DT6 disponible.

`[CONFIRMADO]` Cambio entre la vista previa y la confirmación → conflicto; no se emite foto
parcial (patrón E4.9 AC-11).

### 5.4 Re-cerrar

1. **Comprobaciones.** La ventana sigue abierta; la versión esperada es la última; no
   apareció un cierre posterior; el preflight y la revalidación están vigentes; el motivo
   de re-cierre está presente si D3-B.
2. **Transacción.** Crear el cierre de versión `N+1`, la foto completa, la auditoría y el
   intento. La secuencia de versión es `MAX(version)+1`; v1 y las versiones anteriores no
   se tocan.
3. **Fallo.** Rollback total: no hay v2, no hay foto parcial, el ciclo sigue `Reabierto(vN)`
   y v1 sigue consultable. El reintento es posible.
4. **Respuesta.** Devolver la versión nueva, la foto y el vínculo con la versión de origen.
   El estado pasa a `Cerrado(vN+1)`.

### 5.5 Cancelar (solo si D8-B)

`[PENDIENTE D8]` Si se aprueba, la cancelación es una transición auditada
`Reabierto(vN) → Cerrado(vN)` que no crea foto ni versión. Debe registrar actor, UTC,
motivo y versión de origen. Si no se aprueba, el ciclo permanece reabierto hasta el
re-cierre y D1 debe prever una salida para no bloquear indefinidamente.

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
| `reCerrarCiclo(ciclo, solicitud)` | Motivo de re-cierre si D3-B, versión esperada, fingerprint de preflight, clave de intento | Versión nueva, foto, vínculo v1→v2 | Crea una sola versión; fallo → rollback. |
| `cancelarReapertura(ciclo, solicitud)` | Motivo, versión esperada, clave de intento | Estado `Cerrado(vN)` | Solo si D8-B; no crea foto. |

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
| `SIN_CAMBIOS` | Re-cierre sin cambios, solo si se aprueba esa política. | Validación |
| `DT6_BLOQUEADO` / `E35_BLOQUEADO` | Falta evidencia de backup/restauración o E3.5 no es verificable. | Bloqueo |
| `DT9_NO_HABILITADO` | Intento de reabrir un ciclo antiguo. | Bloqueo/validación |
| `FOTO_NO_ENCONTRADA` | Se pide una versión inexistente. | No encontrado |

`[CONFIRMADO]` Sin servicios externos. El backup se verifica como preflight DT6/T-BKP; un
fixture no acredita DT6.

---

## 8. T1/T2/T3 during the rectification window

| Nivel | Mientras `Reabierto` | Auditoría | Límite |
| --- | --- | --- | --- |
| **T1** | `[PENDIENTE D2]` Bloqueado con `HISTORY_LOCKED` si D2-A; permitido solo dentro de la ventana y del ciclo si D2-B (incluida Ventas E4.2, ya confirmada en T1 de E4.9). | Si se permite: impacto, motivo, actor, UTC y revisión por escritura. | Nunca S0, `inicio`/`Fin` ni identidad congelada. No desbloquea otros ciclos. |
| **T2** | Permitido con impacto, motivo y auditoría; la foto v1 no se altera. | La ya exigida por la ruta T2, más correlación con la ventana. | No modifica v1; las vistas vivas se actualizan o se marcan. |
| **T3** | Permitido. | La vigente; si la foto guarda versión del nombre, no se altera. | No se usa para eludir T1/T2. |

`[CONFIRMADO]` Al re-cerrar, la ventana se cierra y T1 vuelve a bloquearse. **`[PENDIENTE D8]`**
La cancelación, si se aprueba, produce el mismo cierre de ventana sin crear foto. Si D2-B
habilita T1, la ventana no puede quedar abierta indefinidamente sin una regla de resolución
(D1/D8). La reapertura de un ciclo no cambia el nivel T1/T2/T3 de otro ciclo.

---

## 9. Revalidation of later dependencies

`[CONFIRMADO]` E4.10-AC3 exige revalidar dependencias posteriores sin modificar
automáticamente su saldo inicial. La revalidación es de solo lectura y se registra.

`[PENDIENTE D4]` La matriz exacta no está aprobada. Candidata, sin ampliar AC-20 por
analogía:

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
auditoría de reapertura de E4.10 no se congelan; E4.9 ya está integrado y solo admite dos
acciones. **`[PROPUESTA]`** La reapertura debe ser reconstruible sin depender de la foto.

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
`[PENDIENTE]` La política de versiones no se congela; D5/E4.11 deciden la regla funcional
de versión vigente y repetibilidad. E4.9 ya está integrado.

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
6. `[PENDIENTE D5]` Mientras el ciclo está reabierto, la última versión cerrada sigue
   consultable; la regla de «vigente» para agregados y la posibilidad de v3 quedan
   abiertas.
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
- **Preparación del re-cierre:** resumen de diferencias frente a v1, bloqueos/avisos,
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
  ventana se resuelve según D8; no se toca el cierre posterior (AC16).
- Dependencia posterior contradictoria → bloqueo o aviso según D4; sin cambios
  automáticos de S0/plan (AC17).
- `SinPlan` → válido; v2 lo captura; no se inventan líneas. `PlanNoVerificable` → bloqueo
  (AC19).
- Auxiliar sin hechos o fuente no disponible → `No disponible` con motivo; no se copia v1
  como actual (AC19).
- Ciclo sin hechos → la foto de E4.9 ya lo captura; E4.10 no lo reinterpreta (AC19).
- Re-cierre sin cambios → `[PENDIENTE]`; si se aprueba `SIN_CAMBIOS`, se rechaza; si no,
  se crea v2 con auditoría. No se decide aquí.
- Reabrir después de v2 (v3) → `[PENDIENTE D1/D5]`; candidato: no habilitado hasta
  decisión; nunca se ramifica la historia.
- Reapertura tras cancelación → solo si D8-B; nueva ventana auditada, sin reutilizar la
  clave anterior.
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
- **Gates heredados de E4.9:** E3.5 está integrado pero AC-15 sigue PARCIAL; DT6 bloquea el
  cierre real. E4.3/E4.2/E4.4 no disponibles se capturan como `No disponible` con motivo si
  el cierre está autorizado; no se declaran capturados.
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
| E4.10-AC04 | Intentar reabrir un cierre no último o una versión histórica distinta de la última. | Rechazo `NO_ES_ULTIMO_CIERRE`/equivalente; DT9 no habilitado; sin estado parcial. | `[CONFIRMADO]` P5/DT9; `[PROPUESTA]` rechazo de versión histórica |
| E4.10-AC05 | Fallo inducido dentro de la transacción de reapertura. | Rollback total; el cierre sigue `Cerrado(vN)`; sin evento ni auditoría huérfana. | `[PROPUESTA]` |
| E4.10-AC06 | Reabrir con motivo, actor y UTC; consultar después. | Estado `Reabierto(vN)`; motivo/actor/UTC persistidos; no se crea foto ni versión de foto. | `[PROPUESTA]` D3/D5 |
| E4.10-AC07 | Consultar y intentar modificar v1/foto mientras el ciclo está reabierto. | v1 y foto intactas; consulta devuelve valores persistidos; `PATCH`/`DELETE` rechazados. | `[CONFIRMADO]` inmutabilidad |
| E4.10-AC08 | Reclasificar un hecho T2 dentro de la ventana. | Impacto, motivo y auditoría; v1 intacta; vista viva actualizada o marcada. | `[CONFIRMADO]` T2 |
| E4.10-AC09 | Escritura T1 dentro/fuera de la ventana, según D2. | Si D2-A: `HISTORY_LOCKED` siempre. Si D2-B: permitida solo en ventana/ciclo, auditada; S0/ventana/Fin siempre bloqueados. | `[PENDIENTE D2]` |
| E4.10-AC10 | Re-cerrar tras corregir. | Exactamente una versión nueva `N+1` con el contrato completo de foto; v1 y versiones anteriores intactas; vínculo consultable. | `[CONFIRMADO]` DT4; `[PROPUESTA]` versión única por operación |
| E4.10-AC11 | Repetir reapertura/re-cierre con la misma clave y payload; luego con payload distinto. | Reintento idéntico devuelve el mismo resultado/versión; payload distinto → conflicto de idempotencia; sin duplicados. | `[CONFIRMADO]` patrón E4.9 |
| E4.10-AC12 | Dos reaperturas o dos re-cierres concurrentes; versión esperada obsoleta. | Solo una operación gana; la otra recibe conflicto; no se crean dos versiones ni dos ventanas. | `[PROPUESTA]` D7 |
| E4.10-AC13 | Fallo inducido en la transacción de re-cierre. | Rollback total; sin v2 ni foto parcial; el ciclo sigue `Reabierto(vN)`; v1 consultable; reintento posible. | `[CONFIRMADO]` atomicidad |
| E4.10-AC14 | Intentar saltarse la restricción por API: re-cerrar sin reabrir, reabrir un no último, escribir v1, reabrir una versión histórica, omitir versión esperada. | Todas las rutas rechazan con motivo; sin cambio de estado ni escritura. | `[PROPUESTA]` |
| E4.10-AC15 | Re-cerrar sin preflight/backup verificable, sin restauración DT6 o sin E3.5/FIN_NETA verificable. | Bloqueo antes de escribir; sin v2; fixtures marcados sintéticos; cierre real solo con DT6 y E3.5 verificable. | `[CONFIRMADO]` DT6 / E3.5 |
| E4.10-AC16 | Crear un cierre posterior entre la reapertura y el re-cierre. | El re-cierre se detiene con error motivado; no hay v2 silenciosa; el cierre posterior no se altera; la ventana se resuelve según D8. | `[PROPUESTA]` AC1/AC3 |
| E4.10-AC17 | Dependencia posterior contradictoria en la revalidación. | Bloqueo o aviso según D4; valores comparados auditados; ningún S0/plan ajeno modificado. | `[PENDIENTE D4]` |
| E4.10-AC18 | Recorrer la cadena v1 → reapertura → correcciones → v2. | Auditoría completa, append-only y consultable; actor/UTC/motivo/versiones/fingerprint; sin huecos ni eventos huérfanos. | `[CONFIRMADO]` auditoría |
| E4.10-AC19 | Reabrir y re-cerrar con plan `SinPlan`/capturado y auxiliares disponibles o no. | v2 captura el estado vigente sin inventar líneas; fuente ausente → `No disponible` con motivo; v1 intacta. | `[PENDIENTE D6]` |
| E4.10-AC20 | Consultar v1 y v2 tras el re-cierre, con y sin versión explícita. | Devuelve valores persistidos, versión seleccionada, última cerrada y estado de reapertura; sin recálculo ni `0` por ausencia. | `[CONFIRMADO]` foto/AC-14 |
| E4.10-AC21 | Cancelar una reapertura, si D8-B. | Vuelve a `Cerrado(vN)` sin v2; evento auditado; v1 intacta; T1 re-bloqueado. | `[PENDIENTE D8]` |
| E4.10-AC22 | Intentar reabrir un ciclo antiguo o usar restore de backup como reapertura. | Rechazo; no hay ruta alternativa; motivo auditado; DT9/DT6 no se confunden con E4.10. | `[CONFIRMADO]` P5/DT9/DT6 |

`[PENDIENTE]` No hay AC para «reabrir tras v2 (v3)» ni para «re-cierre sin cambios» hasta
que D1/D5 y la política de `SIN_CAMBIOS` se resuelvan. No se declaran como PASS ni como
excluidos por inferencia.

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
| E4.11 (scope) | Versión vigente y agregados. | AC20; D5 |

---

## 18. Decisiones materiales pendientes (6 bloques)

1. **Alcance y límite (D1 + D9).** Reserva de «último» mientras está reabierto,
   repetibilidad tras v2 y confirmación de que DT9 queda fuera con SPEC propia.
2. **Ventana T1 (D2).** ¿Solo T2 o también T1 acotada a Movimientos/Compras dentro de la
   ventana, con auditoría por escritura y S0/ventana siempre bloqueados?
3. **Motivo y actor (D3).** ¿Motivo en reapertura y re-cierre, o solo en reapertura? ¿Actor
   fijo de sesión sin roles nuevos?
4. **Revalidación y recuperación (D4 + D8).** ¿Contradicción de dependencias bloquea o
   avisa? ¿Se permite permanecer reabierto y cancelar sin v2?
5. **Versiones, agregados, plan y auxiliares (D5 + D6).** ¿Qué versión es la vigente sin
   v2? ¿Se bloquean o marcan los agregados E4.11? ¿Plan/auxiliares rectificables y v2 con
   comparación frente a v1?
6. **Concurrencia observable (D7).** ¿Se acepta versión esperada + idempotencia, con
   reintento idéntico seguro y conflicto ante payload/versión distintos?

**No se decide aquí:** DT9, la forma definitiva de reapertura (evento, tabla, estado o
versión), las rutas canónicas, la tabla de auditoría ni la política de versiones
(D5/E4.11). E4.9 ya está integrado. Los detalles marcados `[PENDIENTE]` dentro de estos
bloques (v3, `SIN_CAMBIOS`, inclusión exacta en el fingerprint) se resuelven con la
decisión del bloque o en el paquete DEV; no son decisiones adicionales. Aprobar esta SPEC
no autoriza DEV ni merge.
