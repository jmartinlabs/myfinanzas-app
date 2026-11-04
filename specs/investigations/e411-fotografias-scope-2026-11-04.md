# E4.11 — Fotografías de ciclo/trimestre/año: alcance, fuentes y decisiones (2026-11-04)

**Estado:** documento de preparación. **No aprueba SPEC29, no autoriza DEV y no declara
ningún AC.** Base documental: `main` `0b8aade`. E4.9 se lee en el estado del PR **#200**
(`feat/e49-cierre`, head `2fe5d01`), **OPEN y en draft**, no mergeado.

**Leyenda:** `[CONFIRMADO]` = regla de un documento aprobado o decisión registrada;
`[PROPUESTA]` = detalle candidato; `[PENDIENTE]` = decisión/evidencia que aún no existe.
`[IMPLEMENTADO PR #200]` = existe en la rama del PR, no integrado ni validado por QA.

Fuentes principales: [roadmap E4.11](../roadmap.md#e411--fotografías-de-ciclotrimestreaño-consultables),
[DT4/DT9](../roadmap.md#decisiones-abiertas-y-puntos-de-autorización),
[SPEC27](../27-e49-cierre-financiero-specification.md),
[testplan E4.9](../27-e49-cierre-financiero-testplan.md),
[SPEC20/E4.5](../20-historico-precontrol-specification.md),
[SPEC24/E4.6](../24-e46-resumen-inicio-specification.md),
[brief E4.9](e49-decision-brief-2026-11-04.md),
[análisis E4.10](e410-reapertura-analysis-2026-11-04.md).

---

## 1. Distinción estricta: foto persistida, cálculo vivo y archivo precontrol

E4.11 no puede tratar como equivalentes tres cosas que el sistema ya separa. La tabla fija
qué puede mostrar cada una y qué no puede hacer nunca.

| Dimensión | **Foto persistida de cierre** (E4.9/E4.10) | **Cálculo vivo** (E4.6/E2.6) | **Archivo precontrol** (E4.5) |
| --- | --- | --- | --- |
| **Naturaleza** | Evidencia financiera capturada e inmutable en un cierre. | Composición de solo lectura de motores vigentes. | Registro histórico de solo lectura con procedencia, mapping y cobertura. |
| **Autoridad** | E4.9/E4.10 (SPEC27; re-cierre v2 en E4.10). | E4.6 consume E2.6, E2.4, E1.1, E4.2/E4.3/E4.4, E3.6; no crea economía nueva. | E4.5; no es un segundo ledger, ni plan, ni foto. |
| **Cuándo existe** | Al cerrar/re-cerrar un ciclo, en transacción única. | En cada consulta; no se persiste como foto. | Cuando existe un archivo/mapping/corte verificados; se consulta por ejercicio y corte. |
| **Referencia temporal** | Ventana congelada `[inicio, fin]` del ciclo; `fin` acreditado por el siguiente Inicio. | Contexto vivo del ciclo/posición actual. | Ejercicio natural y `corteConsulta` inclusivo; cada fuente conserva su propio corte. |
| **Mutabilidad** | Inmutable; v1/v2; no se actualiza ni se borra; retención permanente. | Cambia con los motores y con T2/T3; no es histórico. | Inmutable por versión de registro (`version`, `reemplazaA`); solo la vigente suma; no hay DELETE. |
| **Qué puede mostrar** | Hechos, totales, plan final/`SinPlan`, clasificación/referencias, inversión a `Fin`, auxiliares, cobertura, backup y no disponibles, con versión de app/esquema y fingerprint. | Liquidez, ciclo, saldos/bolsas, ahorro, inversión, deuda y pendientes **actuales**, con motor y cobertura. | Archivo por Partida, cobertura, detalle precontrol/control, mapping, procedencia y estados; total certificado solo con cobertura y vínculo verificables. |
| **Qué no puede mostrar/hacer** | No se recalcula desde el estado vivo; no presenta `0` por ausencia; no declara completo un total parcial; no captura E3.5 si no es verificable (el cierre se bloquea); no sustituye un plan inexistente. | No es evidencia histórica; no se etiqueta como foto; no congela cifras; no debe usarse para afirmar «lo que valía al cierre». | No es una foto ni se transforma en una; no crea Movimientos, planes, aperturas ni cierres ausentes; no inventa `0` por falta de cobertura; `tipoRegistro=Archivo`, mientras `Foto` pertenece a E4.11. |
| **Versión/corte** | Versión de foto y fingerprint; corte = `Fin` congelado. | Sin versión histórica; revisión técnica del estado vivo. | `versionMapping`, `versionFuente`, `corteArchivo`, intervalos y cobertura por fuente. |
| **Uso en E4.11** | Fuente principal de la consulta histórica por ciclo/versión. | Solo contraste etiquetado («actual» vs «foto»), nunca como histórico. | Fuente separada para precontrol; no compone la foto de cierre. |

### 1.1 Consecuencias confirmadas

- `[CONFIRMADO]` La foto de cierre «no se recalcula desde el estado vivo» (SPEC27, «Data
  model and contracts» y AC-14); E4.11-AC1 exige que las consultas históricas muestren
  «valores persistidos de la foto, no recálculo retroactivo» (roadmap).
- `[CONFIRMADO]` E4.6 **no lee estado de cierre, precierre ni foto**, no crea snapshots y se
  limita a leer motores vivos (SPEC24, «Fronteras con E4.7 y E4.9»). Por tanto, un valor de
  E4.6 nunca es una foto.
- `[CONFIRMADO]` E4.5 declara que el archivo «no es un segundo ledger, no es una fotografía
  de cierre y no es un plan» (SPEC20, «Functionality»). Su AC-01 (C/E4.11) exige que la
  UI/API distinga `Archivo`, `Detalle` y `Foto`, y que la foto no se recalcule desde archivo.
- `[PENDIENTE]` La **foto agregada de trimestre/año** que E4.11 pueda crear no está definida
  todavía: no se sabe si es una nueva foto persistida, una vista determinista sobre fotos de
  ciclo o ambas. Hasta decidirlo, no debe llamarse «foto» sin calificarla.

### 1.2 Frontera con E4.7

`[CONFIRMADO]` E4.7 es «Resumen Anual y flujo completo trazable»: compara ejercicio, ciclo
y márgenes, y consume histórico válido (roadmap). E4.11 es «fotografías de ciclo/trimestre/año
consultables»: evidencia por corte y versión, distinta de los cálculos actuales.

`[PROPUESTA]` E4.11 aporta la **evidencia persistida** y su consulta; E4.7 decide las
métricas/comparaciones anuales. E4.11 no debe fijar definiciones de márgenes ni sustituir el
flujo anual. La coordinación exacta entre un «agregado anual E4.11» y el «resumen anual
E4.7» queda `[PENDIENTE]` y debe resolverse en la SPEC de E4.11 o en una nota de frontera
aprobada.

---

## 2. Fuentes y dependencias

| Fuente/dependencia | Estado | Qué aporta | Límite |
| --- | --- | --- | --- |
| **E4.5 — archivo precontrol** | SPEC20 aprobada; DEV no autorizado/bloqueado; DT7 sigue siendo gate. | Registros de archivo, mapping, cobertura, corte y procedencia; consulta por ejercicio. | No crea fotos, cierres, planes ni hechos; no se transforma en foto. |
| **E4.9 — cierre y primera foto** | SPEC27 aprobada; PR #200 OPEN/draft; v25; AC UNRUN en el testplan documental. | Foto v1 inmutable, versión, ventana, S0, plan, hechos, inversión, auxiliares, cobertura y backup. | No hay reapertura; el cierre real depende de E3.5 verificable y DT6/T-BKP. |
| **E4.10 — reapertura/re-cierre** | Roadmap/AC definidos; SPEC28 asignada y no iniciada. | v2 y versión vigente tras una rectificación ordinaria del último cierre. | No implementado; su política de versiones/estado es `[PENDIENTE]` (ver análisis E4.10). |
| **DT4 — contenido, metadatos, versiones, retención** | `[CONFIRMADO]` Resuelta el 2026-10-28 en SPEC27. | Contrato de foto, v1/v2, metadatos inmutables, retención permanente y regla «trimestre/año usan la versión vigente al generar el agregado, registran cuál usaron y queda congelado». | No fija la **composición** exacta de un periodo ni el estado «reabierto sin v2»; eso sigue `[PENDIENTE]`. |
| **Versiones y cortes** | `[CONFIRMADO]` v1/v2 por ciclo; corte = `Fin` congelado; versiones anteriores consultables. | Identidad y trazabilidad por ciclo/versión. | No hay regla de qué versión de cada ciclo compone un trimestre/año; `[PENDIENTE]`. |
| **Periodos trimestre/año** | `[PENDIENTE]` E4.11 debe definirlos. | Agrupación calendario o de ciclos, con corte y versión. | No se puede prorratear, dividir ni inventar un ciclo que cruce el límite sin decisión. |
| **E2.6/E4.6 — cálculo vivo** | E4.6 spec aprobada, DEV no autorizado; E2.6 integrado. | Valores actuales para contraste/etiquetado. | No es fuente de valores persistidos ni de historia. |
| **DT9 — rectificación excepcional de ciclos antiguos** | `[PENDIENTE]` No habilitar hasta otra SPEC aprobada. | Efecto sobre fotos trimestrales/anuales y cierres posteriores. | E4.11 no debe implementar la excepción ni decidirla por sí sola. |
| **DT6/T-BKP** | `[PENDIENTE]` Sin destino externo/restauración real. | Cierre real y evidencia de backup. | Fixtures no acreditan DT6; la consulta histórica de fixtures sí puede prepararse. |

### 2.1 Contenido de la foto (DT4 resuelta en SPEC27)

`[CONFIRMADO]` El contrato de foto incluye: identidad (ciclo, versión de foto, fecha UTC,
actor, motivo, fingerprint, versión de aplicación y de esquema), ventana, hechos, plan,
clasificación/referencias, inversión E4.1, auxiliares, cobertura, backup y no disponibles
(SPEC27, «Photo contract»). `[PENDIENTE]` La inclusión del efecto/identidad de Ventas E4.2
en el bloque de inversión y la exclusión motivada de conciliaciones E4.4 son propuestas del
[brief E4.9](e49-decision-brief-2026-11-04.md), no contrato aprobado de E4.11. E4.11 debe
leer lo que la foto realmente capture y declarar `No disponible`/motivo cuando falte, sin
reconstruirlo.

### 2.2 Qué versión de ciclo compone un periodo

`[CONFIRMADO]` DT4: el agregado usa la «versión vigente en el momento de generarse»,
registra la versión usada y queda congelado; las versiones anteriores siguen consultables
(SPEC27).

`[PENDIENTE]` La regla anterior no resuelve por sí sola:

- si el ciclo está **reabierto y sin v2**, ¿cuál es la versión vigente?;
- si un trimestre contiene varios ciclos y cada uno tiene una versión distinta, ¿se toma la
  última de cada uno en el instante de generar, o una versión explícita por ciclo?;
- si un ciclo cruza el límite del trimestre/año, ¿se incluye por `Fin`, por solapamiento,
  solo si está contenido, o se prorratea? (no prorratear sin decisión);
- si un ciclo no tiene cierre, ¿se excluye con motivo/cobertura o se bloquea el agregado?;
- si después se crea v2, ¿el agregado anterior se conserva congelado y se crea uno nuevo, o
  se marca obsoleto?

---

## 3. Decisiones pendientes (DT4/DT9)

| # | Decisión | Opciones | Impacto | Quién decide |
| --- | --- | --- | --- | --- |
| P1 | **Versión de ciclo que compone un periodo** | A) última versión cerrada de cada ciclo en el instante de generar; B) versión explícita elegida por el usuario; C) todas las versiones visibles y el agregado declara la usada; D) solo ciclos con v1 y bloquear si hay reapertura. | A es simple pero cambia si hay re-cierre; B es auditable pero más compleja; C conserva historia; D evita mezclas pero bloquea informes. | Usuario, con propuesta técnica (DT4/DT9). |
| P2 | **Agregado persistido vs consulta determinista** | A) nueva foto de trimestre/año con versión, fingerprint y referencias a las fotos de ciclo; B) vista calculada al consultar desde fotos inmutables; C) híbrido: vista por defecto y congelación explícita. | A permite responder «qué mostraba el trimestre entonces»; B no añade almacén pero depende de una regla fija; C añade dos caminos. | Usuario; el mecanismo técnico lo propone el agente. |
| P3 | **Periodo y frontera** | A) trimestre/año natural por calendario; B) periodos de ciclo financiero; C) ambos, etiquetados; D) solo consultas por ciclo y año natural, sin trimestre hasta definirlo. | A encaja con «trimestre/año»; B respeta ciclos que cruzan diciembre; C duplica; D reduce alcance. | Usuario; no prorratear ni dividir sin regla. |
| P4 | **Ciclo reabierto sin v2** | A) excluir y marcar «pendiente de re-cierre»; B) usar la última versión cerrada (v1) y marcarla; C) bloquear la generación del agregado. | A/B conservan informes pero pueden quedar obsoletos; C es más estricto y puede bloquear. | Usuario, coordinado con E4.10 D5. |
| P5 | **Mezcla de versiones** | A) prohibir un agregado con versiones distintas; B) permitir y registrar la versión de cada ciclo; C) generar un agregado por combinación. | A simplifica pero puede impedir periodos reales; B es transparente; C explota combinatoriamente. | Usuario; DT4 exige registrar la versión usada. |
| P6 | **Retención** | A) permanente para fotos y agregados; B) permanente para fotos, agregados regenerables; C) poda de agregados antiguos. | DT4 ya fija retención permanente de fotos; C contradice la evidencia histórica. | Usuario confirma el alcance de «foto» y «agregado». |
| P7 | **Consulta y selección** | A) por ciclo/versión; B) por trimestre/año; C) por corte; D) combinación con selector de versión y origen. | Afecta API/UI, trazabilidad y claridad «vivo vs foto vs archivo». | Usuario revisa UX (DT8) y criterio financiero. |
| P8 | **DT9 — ciclos antiguos** | A) no habilitar; B) habilitar solo con SPEC propia aprobada. | A mantiene P5; B exige definir efecto en agregados y cierres posteriores. | Usuario; no se implementa en E4.11 por inferencia. |

`[PENDIENTE]` Ninguna de estas decisiones debe resolverse dentro del código ni por el
desarrollador. Aprobar la SPEC de E4.11 no autoriza DEV.

---

## 4. Alcance propuesto, exclusiones y siguiente paquete

### 4.1 Alcance propuesto `[PROPUESTA]`

- Consultar **fotos de cierre persistidas** por ciclo, versión y corte, con sus metadatos
  inmutables (app/esquema, fingerprint, actor, motivo, ventana, cobertura).
- Consultar **trimestre/año** según la política que se apruebe: agregado persistido o vista
  determinista, siempre con la versión/corte de cada foto de ciclo y sin recálculo desde
  motores vivos.
- Distinguir de forma visible y contractual **foto persistida vs cálculo vivo vs archivo
  precontrol**; etiquetar cada cifra con su origen y cobertura.
- Mostrar estados `Completo/Parcial/No disponible` con motivo; no convertir ausencia en `0`.
- Permitir seleccionar versión anterior (v1) y comparar con la vigente (v2) sin alterar
  ninguna.
- Excluir ciclos sin cierre con motivo/cobertura, sin inventar una foto.
- Navegar de la cifra agregada a las fotos de ciclo que la componen (trazabilidad).
- Continuidad entre ejercicios: 2026 consultable tras 2027; no se reetiqueta ni se borra.
- Consulta de solo lectura; sin escritura, salvo la eventual creación de un agregado
  persistido si se aprueba P2-A.

### 4.2 Exclusiones `[CONFIRMADO/PROPUESTA]`

- `[CONFIRMADO]` No crea cierres ni fotos de ciclo: eso es E4.9/E4.10.
- `[CONFIRMADO]` No reabre ni rectifica ciclos: E4.10 y DT9.
- `[CONFIRMADO]` No recalcula retroactivamente ni presenta el cálculo vivo como histórico
  (roadmap E4.11-AC1; SPEC27 AC-14).
- `[CONFIRMADO]` No transforma el archivo E4.5 en fotos, planes o hechos inexistentes
  (roadmap E4.11-AC3; SPEC20).
- `[CONFIRMADO]` No decide en silencio qué versión de ciclo forma un trimestre/año (roadmap,
  «Fuera» de E4.11).
- `[PROPUESTA]` No implementa valoración/resultado/patrimonio E4.3, Ventas E4.2 ni
  conciliaciones E4.4 más allá de lo que la foto capture.
- `[PROPUESTA]` No poda ni borra fotos/versiones (DT4: retención permanente).
- `[PROPUESTA]` No aprueba wireframes/UI definitiva ni autoriza DEV.

### 4.3 Criterios de entrada para SPEC29

- `[PENDIENTE]` E4.9 **mergeado** y con QA independiente; contrato de foto y rutas
  canónicas estabilizados. Sin eso, E4.11 construiría sobre un contrato no confirmado.
- `[PENDIENTE]` E4.10 con SPEC aprobada y política de versiones/estado fijada, o decisión
  explícita de limitar E4.11 a ciclos con v1 y excluir reaperturas.
- `[PENDIENTE]` Decisiones P1–P7 del usuario (versión, agregado, periodo, reabierto, mezcla,
  retención, consulta); P8 (DT9) explícitamente fuera.
- `[PENDIENTE]` Si se muestra el archivo E4.5: su DEV/DT7 y su frontera de consulta; si no,
  E4.11 puede excluirlo y limitarse a fotos E4.9/E4.10.
- `[PENDIENTE]` DT6/T-BKP para cierre real; fixtures para desarrollo y pruebas.
- `[CONFIRMADO]` DT4 ya resuelta (contenido, metadatos, versiones, retención) no se reabre;
  se aplica.
- `[CONFIRMADO]` Aprobar SPEC29 no autoriza DEV; el DEV es un gate separado.

### 4.4 Siguiente paquete propuesto

`[PROPUESTA]` **`E4.11 · SPEC29`**, no DEV, después de que E4.9 esté mergeado/QA y E4.10
tenga al menos su política de versiones aprobada. La SPEC debe empezar por P1/P2/P3 (versión,
agregado, periodo), porque sin ellas no se puede escribir un contrato de consulta estable.

`[PROPUESTA]` Si el usuario prefiere resolver antes la composición trimestre/año, el paquete
anterior sería un **análisis breve de composición de periodos** (sin SPEC y sin código), pero
solo si evita duplicar este documento; no se propone como ruta por defecto.

`[CONFIRMADO]` No se autoriza DEV de E4.11 en este documento.

---

## 5. Riesgos y mitigaciones

| Riesgo | Por qué importa | Mitigación propuesta |
| --- | --- | --- |
| **Recalcular retroactivamente** | Mostrar valores vivos como si fueran la foto rompe E4.11-AC1 y la confianza en el histórico. | Consultar solo valores persistidos; etiquetar «actual» vs «foto»; probar con fuentes vivas cambiadas después del cierre. |
| **Archivo convertido en fotos inexistentes** | Usar E4.5 para fabricar una foto/plan que nunca existió contradice E4.11-AC3 y SPEC20. | Tipos separados (`Archivo` vs `Foto`), sin ruta de escritura, y pruebas de que el archivo no crea cierres/planes. |
| **Agregados que mezclan versiones** | Un trimestre podría sumar v1 de un ciclo y v2 de otro sin declararlo, o recalcularse tras un re-cierre. | Registro de composición por ciclo/versión/fingerprint; agregado inmutable o consulta determinista; prohibir la mezcla silenciosa. |
| **Estado reabierto sin v2** | Un agregado generado en ese hueco puede quedar incompleto o ambiguo. | Regla explícita P4: excluir/marcar/bloquear; coordinación con E4.10 D5. |
| **Periodo que cruza frontera** | Un ciclo que cruza diciembre/trimestre puede contarse dos veces o prorratearse sin base. | Decidir P3; no prorratear; declarar cobertura y corte; probar 2026→2027. |
| **Cobertura parcial presentada como completa** | Fotos con fuentes `No disponible` o ciclos sin cierre pueden parecer totales cerrados. | Mostrar cobertura/motivo por total; `No disponible` no es `0`; no certificar un agregado parcial. |
| **Pérdida de trazabilidad de versión** | Sin versión/corte/origen, no se puede auditar qué foto sostiene una cifra. | Exigir versión de foto, corte, fingerprint y referencia a la foto de ciclo; selector de versión visible. |
| **Confusión con E4.7** | Dos «anuales» con criterios distintos pueden duplicar o contradecir cifras. | Frontera documental E4.7/E4.11; E4.11 aporta evidencia, E4.7 decide métricas/comparación. |
| **DT9 habilitado por la puerta trasera** | Una consulta de agregados antiguos podría convertirse en rectificación de ciclos antiguos. | E4.11 solo lectura; DT9 en SPEC aparte y aprobación explícita. |

---

## 6. Para el usuario

- **P1/P2:** ¿el trimestre/año debe ser una **foto agregada persistida** (con su propia
  versión/fingerprint) o una **consulta determinista** sobre fotos de ciclo inmutables? ¿Qué
  versión de cada ciclo se usa?
- **P3:** ¿trimestre/año natural por calendario, periodos de ciclo financiero o ambos
  etiquetados? ¿Qué se hace con un ciclo que cruza el límite (sin prorratear por defecto)?
- **P4:** si el último ciclo está **reabierto y sin v2**, ¿el agregado se bloquea, se marca
  pendiente o usa v1? Debe coordinarse con la decisión D5 de E4.10.
- **P5:** ¿se permite un agregado con versiones distintas de varios ciclos, siempre que se
  registre la versión de cada uno, o se prohíbe?
- **P6:** confirmar retención permanente también para los agregados, no solo para las fotos
  de ciclo (DT4 ya fija permanencia para fotos).
- **P7:** ¿qué consulta necesita primero: por ciclo/versión, por trimestre/año, por corte, o
  una combinación con selector de versión y origen? Sin esta respuesta no conviene cerrar la
  API/UI.
- **P8:** confirmar que E4.11 **no** habilita la rectificación de ciclos antiguos (DT9); eso
  exige SPEC propia y aprobación explícita.
- **Estado:** E4.9 sigue en PR #200 **OPEN/draft**; hasta su merge/QA, el contrato de foto y
  la política de versiones no deben darse por definitivos.
