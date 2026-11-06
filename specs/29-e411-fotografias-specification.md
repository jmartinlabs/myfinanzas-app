# 29 — E4.11 Fotografías de ciclo/trimestre/año consultables: Specification

Status: **APROBADA — 2026-11-06.** Aprobación formal del usuario; merge documental #242 `6fe91d7`.
No declara aceptación ni PASS; el DEV se autorizó por separado el 2026-11-06.
Approval source/date: **2026-11-06** — P1-C, P4-A, P5-B, P2-A, P3-B, P6-A, P7-D, P8a-A y P8b-A.
Revisión de Álex no registrada.
Base: `main` `eca4e23` (2026-11-06); E4.9 `0176ffc`, E4.10 I1–I6 integrados.
Ningún AC está ejecutado y este documento no declara PASS.
Contexto y fuentes: [alcance E4.11](investigations/e411-fotografias-scope-2026-11-04.md),
[roadmap E4.11](roadmap.md#e411--fotografías-de-ciclotrimestreaño-consultables),
[SPEC27/E4.9](27-e49-cierre-financiero-specification.md),
[testplan E4.9](27-e49-cierre-financiero-testplan.md),
[SPEC20/E4.5](20-historico-precontrol-specification.md),
[SPEC24/E4.6](24-e46-resumen-inicio-specification.md),
[brief E4.9](investigations/e49-decision-brief-2026-11-04.md),
[análisis E4.10](investigations/e410-reapertura-analysis-2026-11-04.md),
[convención de identificadores](methodology/identifier-convention.md).

El número `29` es soporte documental propuesto en el
[índice](methodology/identifier-index.md); la identidad de la entrega es **E4.11 · SPEC**.

**Leyenda:** `[CONFIRMADO]` = regla de un documento aprobado o decisión ya registrada;
`[PROPUESTA]` = detalle candidato de esta SPEC; `[PENDIENTE]` = decisión o evidencia que
aún no existe. Aprobar esta SPEC, cuando ocurra, no autorizará DEV ni merge.

---

## 1. Capacidad

E4.11 permite consultar evidencia financiera **persistida** por ciclo y por periodo
(trimestre/año), con su versión, corte y origen identificables, distinguiéndola de forma
contractual y visible de un cálculo vivo y de un archivo precontrol.

Incluye, como candidato `[PROPUESTA]`:

- consulta de fotos de cierre por ciclo y versión, con sus metadatos inmutables;
- consulta de trimestre/año con la política aprobada **P2-A/P3-B**: agregado persistido por
  ciclos financiados, sin recálculo desde motores vivos;
- etiquetado de origen (`Foto` / `CalculoVivo` / `Archivo`), versión y cobertura por cifra;
- estados de cobertura y de composición; ausencia nunca convertida en `0`;
- selección explícita de versión y comparación v1/v2 sin alterar ninguna;
- navegación de una cifra de periodo a las fotos de ciclo que la componen;
- continuidad entre ejercicios: lo consultado de 2026 sigue consultable cuando exista 2027;
- consulta de solo lectura, salvo la creación del agregado persistido **P2-A**.

No incluye: crear cierres o fotos de ciclo (E4.9/E4.10), reabrir o rectificar (E4.10/DT9),
recalcular retroactivamente, convertir el archivo E4.5 en foto, definir métricas o
comparaciones anuales (E4.7) ni aprobar UI/wireframes (DT8).

---

## 2. Distinción estricta: foto persistida, cálculo vivo y archivo precontrol

`[CONFIRMADO]` E4.11 no puede tratar como equivalentes tres cosas que el sistema ya
separa. La tabla fija qué puede mostrar cada una y qué no puede hacer nunca; condensa la
tabla del [alcance E4.11](investigations/e411-fotografias-scope-2026-11-04.md#1-distinción-estricta-foto-persistida-cálculo-vivo-y-archivo-precontrol).

| Dimensión | **Foto persistida** (E4.9/E4.10) | **Cálculo vivo** (E4.6/E2.6) | **Archivo precontrol** (E4.5) |
| --- | --- | --- | --- |
| Naturaleza | Evidencia financiera capturada e inmutable en un cierre. | Composición de solo lectura de motores vigentes. | Registro histórico de solo lectura con procedencia, mapping y cobertura. |
| Autoridad | E4.9/E4.10 (SPEC27; v2 en E4.10). | E4.6 consume E2.6, E2.4, E1.1, E4.2/E4.3/E4.4 y E3.6; no crea economía nueva. | E4.5; no es segundo ledger, plan ni foto. |
| Cuándo existe | Al cerrar o re-cerrar un ciclo, en transacción única. | En cada consulta; no se persiste como foto. | Con archivo/mapping/corte verificados; se consulta por ejercicio y corte. |
| Referencia temporal | Ventana congelada `[inicio, fin]`; `fin` acreditado por el siguiente Inicio. | Contexto vivo del ciclo/posición actual. | Ejercicio natural y `corteConsulta` inclusivo; cada fuente conserva su corte. |
| Mutabilidad | Inmutable; v1/v2; no se actualiza ni se borra; retención permanente. | Cambia con motores y con T2/T3; no es histórico. | Inmutable por versión de registro; solo la vigente suma; no hay DELETE. |
| Qué puede mostrar | Hechos, totales, plan final/`SinPlan`, clasificación/referencias, inversión a `Fin`, auxiliares, cobertura, backup y no disponibles, con versión de app/esquema y fingerprint. | Liquidez, ciclo, saldos/bolsas, ahorro, inversión, deuda y pendientes **actuales**, con motor y cobertura. | Archivo por Partida, cobertura, detalle precontrol/control, mapping, procedencia y estados. |
| Qué **nunca** | No se recalcula desde el estado vivo; no presenta `0` por ausencia; no declara completo un total parcial; no captura E3.5 si no es verificable; no sustituye un plan inexistente. | No es evidencia histórica; no se etiqueta como foto; no congela cifras; no afirma «lo que valía al cierre». | No es foto ni se transforma en una; no crea Movimientos, planes, aperturas ni cierres; no inventa `0`; `tipoRegistro=Archivo`. |
| Versión/corte | Versión de foto y fingerprint; corte = `Fin` congelado. | Sin versión histórica; revisión técnica del estado vivo. | `versionMapping`, `versionFuente`, `corteArchivo`, intervalos y cobertura por fuente. |
| Papel en E4.11 | Fuente principal de la consulta histórica por ciclo y versión. | Solo contraste etiquetado («actual» vs «foto»); nunca como histórico. | Fuente separada para precontrol; **no** compone la foto de cierre ni un total de foto. |

### 2.1 Consecuencias confirmadas

- `[CONFIRMADO]` La foto de cierre «no se recalcula desde el estado vivo» (SPEC27,
  «Data model and contracts» y AC-14); E4.11-AC1 del roadmap exige mostrar «valores
  persistidos de la foto, no recálculo retroactivo».
- `[CONFIRMADO]` E4.6 no lee estado de cierre, precierre ni foto; no crea snapshots y se
  limita a motores vivos (SPEC24, «Fronteras con E4.7 y E4.9»). Un valor de E4.6 nunca es
  una foto.
- `[CONFIRMADO]` E4.5 declara que el archivo «no es un segundo ledger, no es una
  fotografía de cierre y no es un plan» (SPEC20, «Functionality»); E4.5-AC-01 (C/E4.11)
  exige que la UI/API distinga `Archivo`, `Detalle` y `Foto`, y que la foto no se
  recalcule desde archivo.
- `[APROBADO P2-A]` El **agregado de trimestre/año** es una **foto persistida**, versionada,
inmutable y con composición exacta; no se recalcula desde motores vivos.

---

## 3. Fuentes y dependencias

`[CONFIRMADO]` Las dependencias se leen en el estado real, no en el estado deseado:

| Fuente/dependencia | Estado verificado | Qué aporta | Límite para E4.11 |
| --- | --- | --- | --- |
| **E4.5 — archivo precontrol** | SPEC20 aprobada; DEV no autorizado; DT7 sigue siendo gate. | Registros, mapping, cobertura, corte y procedencia; consulta por ejercicio. | No crea fotos, cierres, planes ni hechos. **P8b-A:** excluido del primer desarrollo; consulta separada diferida y sin combinar importes. |
| **E4.9 — cierre y primera foto** | SPEC27 aprobada; **integrada** en `0176ffc` con QA APTO CON RESERVAS. | Foto v1 inmutable: versión, ventana, S0, plan, hechos, inversión, auxiliares, cobertura y backup. | E4.10 define v2/reapertura; E4.11 solo lee. |
| **E4.10 — reapertura/re-cierre** | SPEC28 ratificada; **I1–I5 integrados** (v26, reapertura, guardas, re-cierre, cancelación); 24 AC `UNRUN`. | v2, versión vigente, reapertura y re-cierre para E4.11. | E4.11 no crea, reabre ni rectifica; solo lee. |
| **DT4 — contenido, metadatos, versiones, retención** | `[CONFIRMADO]` Resuelta el 2026-10-28 en SPEC27. | Contrato de foto, v1/v2, metadatos inmutables, retención permanente y regla «trimestre/año usan la versión vigente al generar el agregado, registran cuál usaron y queda congelado». | No fija la composición exacta; **P2-A/P3-B** la fijan. |
| **Versiones y cortes** | `[CONFIRMADO]` v1/v2 por ciclo; corte = `Fin` congelado; versiones anteriores consultables. | Identidad y trazabilidad por ciclo y versión. | D5-A/P1-C/P4-A/P5-B aprobadas: composición declarada, ciclo reabierto excluido/marcado y mezcla con registro exacto. |
| **Periodos trimestre/año** | `[APROBADO P2-A/P3-B]` Agregado persistido y periodos por ciclos financiados. | Composición exacta por ciclo/versión/fingerprint; mes financiado; ciclos íntegros. | No se prorratea ni se inventa un ciclo; cada inclusión/exclusión se declara. |
| **E2.6/E4.6 — cálculo vivo** | SPEC24 aprobada; E4.6 integrado `cfbedb0` (#201). | Valores actuales para contraste etiquetado. | No es fuente de valores persistidos ni de historia. |
| **DT9 — rectificación de ciclos antiguos** | `[CONFIRMADO]` D9-A aprobada: solo último cierre; DT9 fuera. | Efecto sobre agregados y cierres posteriores. | E4.11 no implementa ni decide la excepción (M6). |
| **DT6/T-BKP** | `[PENDIENTE]` Sin destino externo ni restauración real. | Cierre real y evidencia de backup. | Fixtures no acreditan DT6; la consulta de fixtures sí puede prepararse. |
| **Esquema** | `[CONFIRMADO]` E4.9 ocupa `v25` y E4.10 I1 ocupa `v26/C26`; no asumir otra. | — | E4.11 es de solo lectura salvo la creación del agregado persistido P2-A; necesitará versión de esquema propia y aprobación. |

### 3.1 Contenido de la foto (DT4 resuelta en SPEC27)

`[CONFIRMADO]` El contrato incluye identidad (ciclo, versión de foto, fecha UTC, actor,
motivo, fingerprint, versión de aplicación y de esquema), ventana, hechos, plan,
clasificación/referencias, inversión E4.1, auxiliares, cobertura, backup y no disponibles
(SPEC27, «Photo contract»). `[PENDIENTE]` La inclusión del efecto/identidad de Ventas E4.2
en el bloque de inversión y la exclusión motivada de conciliaciones E4.4 son propuestas del
brief E4.9, no contrato aprobado. E4.11 **lee lo que la foto realmente capture** y declara
`No disponible`/motivo cuando falte; no lo reconstruye.

---

## 4. Principios

`[CONFIRMADO]` cuando derivan de SPEC27/SPEC20/roadmap; `[PROPUESTA]` cuando son
invariantes candidatos de E4.11.

1. **Solo lectura.** E4.11 no crea, rectifica ni borra cierres, fotos, hechos, planes ni
   archivo. Única excepción: persistir un agregado de periodo **P2-A** con ruta, clave e
   identidad propias. `[CONFIRMADO]`
2. **Inmutabilidad.** La foto E4.9/E4.10 no se actualiza ni se borra; el agregado persistido
   P2-A tampoco. `[CONFIRMADO]`
3. **Sin recálculo retroactivo.** Ninguna cifra histórica se obtiene de motores vivos,
   del precierre ni del archivo. `[CONFIRMADO]` (roadmap E4.11-AC1; SPEC27 AC-14).
4. **Origen, versión y corte identificables.** Cada cifra declara `origen`, versión de
   foto, fingerprint, corte y, si procede, regla de composición. `[PROPUESTA]`.
5. **Ausencia ≠ 0.** Un bloque o ciclo sin evidencia se declara `No disponible` o
   `Parcial` con motivo; nunca `0` por omisión. `[CONFIRMADO]` (SPEC27; SPEC20).
6. **Composición explícita.** Ninguna consulta de periodo elige versión, ciclo o corte en
   silencio: si aplica un valor por defecto, la respuesta lo declara. `[PROPUESTA]`.
7. **Separación de tipos.** `Foto`, `CalculoVivo` y `Archivo` no se suman en un mismo
   total sin etiqueta; el archivo nunca compone un total de foto. `[CONFIRMADO]` por
   E4.5-AC-01 y roadmap E4.11-AC3.
8. **Retención permanente y continuidad.** No se podan fotos ni versiones; un ejercicio
   anterior sigue consultable sin reetiquetarse. `[CONFIRMADO]` (DT4; roadmap).
9. **Trazabilidad descendente.** Toda cifra de periodo puede navegar a las fotos de ciclo
   que la componen y a los ciclos excluidos con su motivo. `[PROPUESTA]`.
10. **DT9 fuera.** No existe ruta para rectificar ciclos antiguos ni para «corregir» una
    foto histórica. `[CONFIRMADO]` (roadmap; DT9).

---

## 5. Decisiones materiales: P1–P8 en seis bloques

`[APROBADO 2026-11-06]` **P1-C, P4-A, P5-B, P2-A, P3-B, P6-A, P7-D, P8a-A y P8b-A.**
La SPEC queda decidida en sus bloques materiales; solo falta la aprobación formal y el DEV
separado. Se mantienen los seis bloques porque P1/P4/P5 no admiten respuestas independientes
sin producir combinaciones incoherentes.

| Bloque | Decisiones heredadas | Tema |
| --- | --- | --- |
| M1 | P1, P4, P5 | Versión por ciclo, ciclo reabierto sin v2 y mezcla de versiones |
| M2 | P2 | Agregado persistido, vista determinista o híbrido |
| M3 | P3 | Periodo, frontera y continuidad entre ejercicios |
| M4 | P6 | Retención de fotos y de agregados |
| M5 | P7 | Consulta y selección explícita de versión |
| M6 | P8 | DT9 y límites del archivo E4.5 |

### M1 — Qué versión de cada ciclo compone un periodo (P1, P4, P5)

| Sub | Opciones | Impacto | Recomendación `[PROPUESTA]` |
| --- | --- | --- | --- |
| **P1** versión que compone | A) última versión cerrada de cada ciclo en el instante de generar; B) versión explícita elegida por el usuario; C) todas las versiones visibles y el agregado declara la usada; D) solo ciclos con v1 y bloquear si hay reapertura. | A es simple pero cambia si hay re-cierre; B es auditable pero más compleja; C conserva historia; D evita mezclas pero bloquea informes. | **Aprobado P1-C:** todas las versiones visibles y composición declarada; la selección explícita forma parte de C. P1-B no se aprueba por separado. No se usa D. |
| **P4** reabierto sin v2 | A) excluir y marcar «pendiente de re-cierre»; B) usar la última versión cerrada (v1) y marcarla; C) bloquear la generación del agregado. | A/B conservan informes pero pueden quedar obsoletos; C es más estricto y puede bloquear. | **Aprobado A**, coordinado con D5 de E4.10; v1 consultable, no vigente sin advertencia. |
| **P5** mezcla de versiones | A) prohibir un agregado con versiones distintas; B) permitir y registrar la versión de cada ciclo; C) un agregado por combinación. | A simplifica pero puede impedir periodos reales; B es transparente; C explota combinatoriamente. | **Aprobado B**, siempre con composición exacta registrada; A queda descartada. |

`[CONFIRMADO]` DT4 exige registrar la versión usada y que el agregado quede congelado; por
tanto **declarar la composición no es opcional** sea cual sea la opción elegida.
`[APROBADO 2026-11-05]` P1-C, P4-A y P5-B. `[APROBADO P3-B]` Si un ciclo cruza el límite,
se atribuye por mes financiado y se incluye íntegro, sin prorrateo.

### M2 — Agregado persistido, vista determinista o híbrido (P2)

| Opciones | Impacto | Recomendación `[PROPUESTA]` |
| --- | --- | --- |
| A) Nueva foto de trimestre/año con versión, fingerprint y referencias a las fotos de ciclo. | Permite responder «qué mostraba el trimestre entonces»; exige almacén, migración y decisión de esquema. | **Aprobado P2-A:** agregado persistido, versionado, inmutable y con composición exacta. |
| B) Vista calculada al consultar desde fotos inmutables, con regla y composición registradas en la respuesta. | No añade almacén ni migración; «congelado» significa determinista sobre fotos inmutables, no recalcular motores. | Alternativa mínima; no fija política por sí sola. |
| C) Híbrido: vista por defecto y congelación explícita. | Dos caminos y dos verdades potenciales; más superficie de error. | Solo si A y B no bastan tras la decisión del usuario. |

`[APROBADO P2-A]` El agregado es una **foto persistida** de trimestre/año, con versión,
fingerprint, composición exacta y referencias a las fotos de ciclo. No se recalcula; su
retención es P6-A. B y C quedan descartadas.

### M3 — Periodo, frontera y continuidad entre ejercicios (P3)

| Aspecto | Opciones | Impacto | Recomendación `[PROPUESTA]` |
| --- | --- | --- | --- |
| Periodo | A) trimestre/año natural; B) periodos de ciclo financiero; C) ambos; D) solo ciclo/año. | A encaja con «trimestre/año»; B respeta ciclos que cruzan diciembre; C duplica; D reduce alcance. | **Aprobado P3-B:** periodos agrupados por **ciclos financiados**, mes financiado como criterio de atribución, ciclos íntegros y sin prorrateo. |
| Ciclo que cruza el límite | A) incluir por `Fin`; B) solapamiento; C) solo contenido; D) prorratear. | A/B pueden contar el ciclo en uno o dos periodos; C excluye ciclos reales; D inventa una división. | **P3-B:** se atribuye por el **mes financiado**; el ciclo se incluye íntegro en su periodo, sin prorrateo, y se declara la ventana completa. |
| Ciclo sin cierre | A) excluir con motivo/cobertura; B) bloquear el agregado. | A conserva informes con cobertura parcial; B impide consultar el periodo. | A, con estado `Parcial` y motivo por ciclo. |
| Continuidad | A) inmutabilidad y consulta permanente; B) vista de transición explícita; C) reetiquetar o recalcular el ejercicio anterior. | A/B conservan evidencia; C contradice DT4 y E4.11-AC2. | A + B (vista de transición), sin reetiquetar ni borrar. |

`[CONFIRMADO]` La continuidad no autoriza a mezclar ejercicios en un mismo total sin
declararlo; un ejercicio anterior no se reetiqueta ni se borra (DT4; roadmap E4.11-AC2).

### M4 — Retención (P6)

| Opciones | Impacto | Recomendación `[PROPUESTA]` |
| --- | --- | --- |
| A) Permanente para fotos **y** agregados. | Coherente con DT4 y con la evidencia histórica; exige coordinar el crecimiento con DT6/T-BKP. | **Aprobado P6-A:** conservación permanente de fotografías y agregados. |
| B) Permanente para fotos; agregados regenerables. | Solo es viable si M2-B: un agregado determinista no es un artefacto que se puede «perder». | B únicamente si M2-B. |
| C) Poda de agregados antiguos. | Contradice la retención permanente y la continuidad entre ejercicios. | No recomendada. |

`[CONFIRMADO]` La retención permanente de **fotos y versiones** ya está fijada por DT4; P6
solo abre el alcance del agregado.

### M5 — Consulta y selección explícita de versión (P7)

| Opciones | Impacto | Recomendación `[PROPUESTA]` |
| --- | --- | --- |
| A) Por ciclo/versión. | Simple y trazable; no responde trimestre/año. | Primera capacidad. |
| B) Por trimestre/año. | Responde el caso de uso principal; se apoya en M1–M3 aprobadas. | Segunda capacidad, tras A. |
| C) Por corte. | Útil para auditar «qué había a Fin»; puede confundirse con el corte vivo. | Como filtro/orden, no como sustituto de versión. |
| D) Combinación con selector de versión y origen. | Máxima trazabilidad; más UI y más estados. | **Aprobado P7-D:** consulta combinada por ciclo, trimestre y año, con selección explícita de versión y procedencia; implementación progresiva. |

`[PROPUESTA]` Si existe un valor por defecto (p. ej. última versión), la respuesta incluye
`seleccionAplicada` y la UI lo muestra; nunca se cambia de versión sin que el usuario lo
vea. Consultar una versión anterior no altera la vigente.

### M6 — DT9 y límites del archivo E4.5 (P8)

| Sub | Opciones | Impacto | Recomendación `[PROPUESTA]` |
| --- | --- | --- | --- |
| **P8** DT9 | A) no habilitar; B) habilitar solo con SPEC propia aprobada. | A mantiene P5 y la inmutabilidad; B exige definir efecto en agregados y cierres posteriores. | **Aprobado P8a-A:** no se habilitan rectificaciones excepcionales de ciclos antiguos. |
| Archivo E4.5 | A) excluirlo de E4.11; B) vista separada de solo lectura; C) combinarlo con fotos. | A reduce alcance; B aporta contexto sin contaminar la foto; C contradice E4.5-AC-01 y E4.11-AC3. | **Aprobado P8b-A:** archivo E4.5 excluido del primer desarrollo; su consulta separada queda diferida y no autoriza combinar importes. C prohibida. |

---

## 6. Contrato conceptual de consulta

`[CONFIRMADO]` Contrato de solo lectura con M1–M6 aprobadas (P1-C/P4-A/P5-B, P2-A,
P3-B, P6-A, P7-D, P8a-A/P8b-A). Las rutas siguen siendo ilustrativas hasta el DEV.

### 6.1 Entidades

| Entidad | Contenido mínimo | Procedencia |
| --- | --- | --- |
| **FotoCiclo** | Identidad (ciclo, versión, UTC, actor, motivo, fingerprint, versión app/esquema), ventana, bloques de la foto, cobertura y no disponibles. | E4.9/E4.10, leída sin transformar. |
| **AgregadoPeriodo** | Periodo, regla de composición, `seleccionAplicada`, fotos de ciclo componentes (ciclo, versión, fingerprint, inclusión/motivo), cobertura y valores; versión/fingerprint propios. | P2-A: persistido e inmutable. |
| **CalculoVivo** | Valores actuales, `revision`, motor(es) y cobertura; marcado explícitamente como no histórico. | E4.6/E2.6. |
| **Archivo (diferido)** | Fuera del primer desarrollo por **P8b-A**; sin ruta, badge ni `tipoRegistro`. | E4.5, consulta separada futura. |

### 6.2 DTO mínimo del agregado

```json
{
  "origen": "Foto",
  "tipo": "Trimestre",
  "periodo": { "ejercicio": 2026, "trimestre": 4, "inicio": "2026-10-01", "fin": "2026-12-31" },
  "seleccionAplicada": { "regla": "P1-C/P4-A/P5-B", "porDefecto": true },
  "identidad": {
    "versionAgregado": "A1",
    "fechaUtc": "2026-11-04T10:00:00Z",
    "fingerprint": "…",
    "versionApp": "…",
    "versionEsquema": "N"
  },
  "composicion": [
    { "ciclo": "C-2026-10", "versionFoto": 1, "fingerprint": "…", "estado": "Incluido" },
    { "ciclo": "C-2026-11", "versionFoto": 2, "fingerprint": "…", "estado": "Incluido" },
    { "ciclo": "C-2026-12", "estado": "ExcluidoSinCierre", "motivo": "SIN_CIERRE" }
  ],
  "cobertura": { "estado": "Parcial", "motivos": ["CICLO_SIN_CIERRE"], "bloques": [] },
  "valores": { "…": "…" },
  "noDisponible": []
}
```

`[PROPUESTA]` Reglas del DTO: `origen` es obligatorio y nunca ambiguo; `composicion`
enumera **todos** los ciclos del periodo, incluidos los excluidos; `versionEsquema` es
ilustrativo y no fija una versión concreta de esquema; los importes sin evidencia son
`null`, no `0`.

### 6.3 Consultas conceptuales

| Operación ilustrativa | Devuelve | Nota |
| --- | --- | --- |
| `GET /api/fotos/ciclos/:ciclo?version=N` | Foto de ciclo o `SinFoto` con motivo. | Versión ausente → 404 con motivo; nunca cae a otra versión en silencio. |
| `GET /api/fotos/ciclos/:ciclo/versiones` | Índice de versiones consultables. | Alimenta el selector M5. |
| `GET /api/fotos/periodos?tipo=Trimestre&ejercicio=YYYY&trimestre=Qn&version=…` | Agregado de periodo con composición y cobertura. | P7-D: ciclo/trimestre/año con selector explícito. |
| `GET /api/fotos/periodos/:id` | Agregado persistido por identidad. | P2-A. |
| `GET /api/fotos/contraste?ciclo=…` | Bloque `CalculoVivo` etiquetado para comparar. | Opcional; nunca sustituye a la foto. |
| `POST/PATCH/DELETE /api/fotos/*` | 405/422. | Excepción: creación del agregado P2-A con ruta y clave propias. |

---

## 7. Estados de cobertura y composición

| Estado | Significado | Regla |
| --- | --- | --- |
| `Completo` | Todos los bloques/ciclos exigidos tienen evidencia y no hay huecos. | Único estado que permite certificar un total del periodo. |
| `Parcial` | Falta al menos un bloque o ciclo, o hay un hueco declarado. | Se muestran los componentes y el motivo; el total es `null` o «parcial», nunca certificado. |
| `NoDisponible` | No hay evidencia consultable para el periodo/ciclo. | Motivo obligatorio; nunca `0`. |
| `SinFoto` | El ciclo existe pero no tiene cierre/foto. | No se crea una foto vacía. |
| `PendienteReCierre` | El ciclo está reabierto sin v2 (P4-A aprobada). | Se declara; v1 no se presenta como vigente sin marca. |
| `ExcluidoSinCierre` | Ciclo del periodo sin cierre. | Aparece en `composicion` con motivo. |
| `FueraDePeriodo` | Ciclo no atribuido a este periodo según P3-B. | Se muestra como contexto, no suma. |

`[CONFIRMADO]` El archivo E4.5 conserva **su propia** terminología
(`Completa`/`Parcial`/`NoAcreditada`/`NoDisponible`/`Solapada`); E4.11 no la redefine ni
la traduce a estados de foto. `[PROPUESTA]` Los estados anteriores son los de foto y
agregado.

---

## 8. Fronteras

| Entrega | Frontera |
| --- | --- |
| **E4.5** | **P8b-A:** excluido del primer desarrollo. No hay ruta, badge, `tipoRegistro` ni totales combinados; su consulta separada queda diferida. |
| **E4.6** | Solo contraste etiquetado `CalculoVivo`; nunca histórico. E4.6 no lee fotos y E4.11 no usa motores vivos para cifras históricas. |
| **E4.7** | E4.11 aporta la evidencia y su consulta; E4.7 decide métricas, márgenes y comparación anual. E4.11 no define márgenes ni sustituye el flujo anual. |
| **E4.9/E4.10** | E4.11 no crea, reabre ni rectifica; lee fotos y versiones. La creación de v2 y el estado reabierto son de E4.10. |
| **DT9** | Fuera: no hay ruta de rectificación de ciclos antiguos ni de «foto corregida». |

---

## 9. Pantallas e interfaces

`[PROPUESTA]` UI provisional, no aprobada (DT8). Contenido mínimo:

- selector de periodo (ciclo / trimestre / año) y de versión;
- badge de origen por cifra (`Foto`, `Actual`) y de versión/corte; el archivo E4.5 queda diferido por P8b-A;
- panel de cobertura y composición con ciclos incluidos/excluidos y motivo;
- navegación de la cifra de periodo a las fotos de ciclo;
- comparación v1/v2 sin edición;
- estados vacío/carga/error/bloqueo y sesión expirada.

`[PROPUESTA]` La UI no muestra `0` por ausencia ni declara «completo» un total parcial; si
hay valores vivos y foto, ambos se muestran separados y rotulados, nunca fusionados.

---

## 10. Vacío, carga y error

| Estado | Comportamiento `[PROPUESTA]` |
| --- | --- |
| Vacío (periodo sin fotos) | «Sin fotos para este periodo» con motivo; no `0` ni foto vacía. |
| Ciclo sin cierre | `SinFoto` con motivo y enlace a E4.8/E4.9 si aplica; no se crea cierre. |
| Periodo parcial | Componentes y huecos visibles; total «parcial»/`null`; no se certifica. |
| Cargando | Conserva periodo, filtros y versión; no muestra totales provisionales. |
| Error de red | Reintento; conserva selección; no demo ni datos inventados. |
| 401/403 | Sesión/MFA/CSRF; no filtra importes ni SQL. |
| Versión inexistente | 404 con motivo; no cae a la última en silencio. |
| Periodo futuro/inválido | 422 con campo y foco; no `0` ni cobertura ficticia. |
| Error técnico | Mensaje genérico con `requestId`; sin payload financiero en logs. |

---

## 11. API behavior and external dependencies

`[PROPUESTA]` Solo lectura; reutiliza autenticación MFA, Origin/CSRF, límite JSON,
errores `Problem`, snapshot transaccional y `no-store`. Sin servicios externos.

- Consultas de foto y periodo devuelven un único snapshot coherente; no mezclan dos
  lecturas.
- `origen`, `versionFoto`/`versionAgregado`, `fingerprint`, corte y cobertura son
  obligatorios en la respuesta.
- Ninguna ruta de escritura de fotos, cierres o ciclos. La creación del agregado P2-A
  tiene ruta, clave de idempotencia y auditoría propias, y no modifica fotos de ciclo.
- Los errores no revelan importes ni estructura interna más allá del motivo funcional.

---

## 12. Validación y casos límite

- Ciclo con foto v1 y T2/T3 posteriores: la foto no cambia; la vista viva sí. `[CONFIRMADO]`
- v1 y v2 coexistentes: ambas consultables; v1 no se actualiza. `[CONFIRMADO]`
- Re-cierre tras un agregado: el agregado persistido anterior no se recalcula (P2-A). `[CONFIRMADO]`
- Ciclo reabierto sin v2: P4-A; prohibido presentarlo como cerrado sin marca.
- Ciclo que cruza límite: **P3-B**; se atribuye por mes financiado y se incluye íntegro, sin prorrateo.
- Ciclo sin cierre dentro del periodo: excluido con motivo y cobertura `Parcial`.
- Periodo con un solo ciclo: sigue siendo agregado válido; no se presenta como foto de
  ciclo.
- Foto con bloques `No disponible` (E4.3/E4.2/E4.4): se muestran con motivo; no se
  completan desde motores vivos.
- E3.5 no verificable: no existe foto (cierre bloqueado); E4.11 no la inventa.
- Cierre fuera de orden (AC-20 de SPEC27): la foto existe con su ventana; el agregado la
  atribuye por **mes financiado** (P3-B), la incluye íntegra y declara la composición, sin
  reordenar historia.
- Renombrado de Partida/Instrumento (T3): la foto conserva ID y versión del nombre.
- Ejercicio futuro o sin fotos: `NoDisponible`/422 según el caso; nunca `0`.
- Consulta concurrente durante un re-cierre: snapshot coherente; no se sirve una foto a
  medias.

---

## 13. Exclusiones

- `[CONFIRMADO]` No crea cierres ni fotos de ciclo (E4.9/E4.10).
- `[CONFIRMADO]` No reabre ni rectifica ciclos (E4.10/DT9).
- `[CONFIRMADO]` No recalcula retroactivamente ni presenta el cálculo vivo como histórico
  (roadmap E4.11-AC1; SPEC27 AC-14).
- `[CONFIRMADO]` No transforma el archivo E4.5 en fotos, planes ni hechos (roadmap
  E4.11-AC3; SPEC20). **P8b-A:** el archivo E4.5 se excluye del primer desarrollo; su
  consulta separada queda diferida y no autoriza combinar importes.
- `[CONFIRMADO]` No decide en silencio qué versión de ciclo forma un trimestre/año
  (roadmap, «Fuera» de E4.11).
- `[CONFIRMADO]` No habilita DT9.
- `[PROPUESTA]` No define márgenes, patrimonio, valoración ni comparación anual (E4.7).
- `[CONFIRMADO P6-A]` No poda ni borra fotos, versiones ni agregados: retención permanente.
- `[PROPUESTA]` No aprueba wireframes/UI definitiva (DT8) ni autoriza DEV.
- `[CONFIRMADO]` No usa datos reales ni cierre real sin DT6/T-BKP.

---

## 14. Acceptance checks candidatos

`[PENDIENTE]` Ningún AC ejecutado ni aprobado. Las decisiones M1–M6 ya están aprobadas y
fijan los parámetros; los AC siguen `UNRUN` hasta el DEV.

| ID | Acción / precondiciones | Resultado esperado |
| --- | --- | --- |
| E4.11-AC01 | Ciclo cerrado con foto v1; aplicar cambios T2/T3 después; consultar foto y cálculo vivo. (P7-D) | La foto devuelve exactamente los valores persistidos al cierre; la vista viva devuelve otros valores, etiquetada `CalculoVivo` con motor y revisión; ninguna cifra de la foto proviene del motor vivo. |
| E4.11-AC02 | Consultar metadatos de una foto de ciclo antes y después de T2/T3. | Ciclo, versión, UTC, actor, motivo, fingerprint, versión de app/esquema y ventana `[inicio, fin]` visibles e idénticos; no se recalculan. |
| E4.11-AC03 | Con v1 y v2 disponibles (E4.10 I4 integrado), seleccionar v1 explícitamente. | Devuelve v1 con `seleccionAplicada`; v2 sigue consultable; no se devuelve otra versión ni se modifica ninguna. |
| E4.11-AC04 | Consultar un trimestre/año con varios ciclos cerrados. (P2-A/P3-B) | Cada cifra agregada referencia las fotos de ciclo que la componen (ciclo, versión, fingerprint) y la regla de composición; ninguna cifra se obtiene de motores vivos. |
| E4.11-AC05 | Periodo con ciclos de versiones distintas y/o un ciclo reabierto. (P1-C/P4-A/P5-B) | La respuesta declara por ciclo versión usada, inclusión/exclusión y motivo; la mezcla se permite con composición exacta; el reabierto se excluye/marca; no hay composición silenciosa. |
| E4.11-AC06 | Ciclo reabierto sin v2 (E4.10 I2 integrado). (P1-C/P4-A) | P4-A aprobada: excluido y marcado `PendienteReCierre`; v1 consultable pero no vigente sin advertencia; no se crea foto. |
| E4.11-AC07 | Generar/consultar un agregado y después re-cerrar un ciclo creando v2. (P2-A/P6-A) | El agregado anterior devuelve los mismos valores y versiones; no se recalcula; un agregado nuevo declara las versiones nuevas. |
| E4.11-AC08 | Navegar desde una cifra de periodo a sus ciclos componentes. (P7-D) | Cada ciclo incluido devuelve su foto y cobertura; cada excluido figura con motivo (sin cierre, pendiente, fuera de periodo). |
| E4.11-AC09 | Periodo con cobertura incompleta: ciclo sin cierre, hueco o fuente `No disponible`. | Estado `Parcial`/`NoDisponible` con motivo por bloque; ningún total parcial se declara completo ni se sustituye por `0`. |
| E4.11-AC10 | Ejercicio con solo archivo E4.5 y sin fotos. (P8b-A) | El primer desarrollo **excluye** el archivo E4.5: no hay ruta ni `tipoRegistro=Archivo`; no se crea foto, cierre ni plan. La consulta separada queda diferida. |
| E4.11-AC11 | Crear el ejercicio siguiente y volver a consultar el anterior. (P3-B) | Fotos y periodos del ejercicio anterior siguen consultables con valores, versiones y cortes; no se reetiquetan, recalculan ni borran; la transición no mezcla ejercicios sin declararlo. |
| E4.11-AC12 | Intentar `POST`/`PATCH`/`DELETE` sobre fotos o periodos. | 405/422; no se crea, rectifica ni borra foto. Excepción única: creación del agregado P2-A, con su ruta y clave. |
| E4.11-AC13 | Intentar rectificar un ciclo antiguo o consultar una «foto corregida» por DT9. (P8a-A) | No existe ruta; se rechaza con motivo; E4.11 no habilita DT9. |
| E4.11-AC14 | Consultar un periodo futuro y un ciclo sin cierre. | Periodo futuro: 422 con campo/motivo. Ciclo sin cierre: `SinFoto` con motivo. Ninguno devuelve `0` ni una foto vacía. |
| E4.11-AC15 | Consultar una foto cuyo bloque E4.3/E4.2/E4.4 consta `No disponible`. | El bloque se muestra `No disponible` con motivo; no se completa desde el motor vivo ni se declara completo el total. |

---

## 15. Trazabilidad

| Fuente | Regla | AC candidatos |
| --- | --- | --- |
| Roadmap E4.11-AC1 | Valores persistidos, no recálculo retroactivo. | AC01, AC04, AC07 |
| Roadmap E4.11-AC2 | Versiones/cortes/origen identificables e inmutables. | AC02, AC03, AC05, AC11 |
| Roadmap E4.11-AC3 | El archivo no se transforma en fotos o planes inexistentes. | AC10, AC12 |
| SPEC27 / DT4 | Foto inmutable, v1/v2, retención, metadatos, «versión vigente al generar». | AC02, AC03, AC06, AC07 |
| SPEC20 / E4.5 | `Archivo` ≠ `Foto`; no se recalcula desde archivo. | AC10, AC15 |
| SPEC24 / E4.6 | Cálculo vivo no histórico. | AC01, AC15 |
| DT9 | Sin rectificación de ciclos antiguos (D9-A). | AC13 |
| P1-C (2026-11-05) | Composición declarada por ciclo y selección explícita. | AC03, AC04, AC05 |
| P4-A (2026-11-05) | Ciclo reabierto excluido y marcado `PendienteReCierre`. | AC06, AC07 |
| P5-B (2026-11-05) | Mezcla de versiones con composición exacta registrada. | AC05 |
| P2-A (2026-11-06) | Agregado persistido, versionado e inmutable. | AC04, AC07, AC12 |
| P3-B (2026-11-06) | Periodos por ciclos financiados, mes financiado, sin prorrateo. | AC04, AC05, AC11 |
| P6-A (2026-11-06) | Retención permanente de fotos y agregados. | AC07, AC11 |
| P7-D (2026-11-06) | Consulta combinada ciclo/trimestre/año con selector explícito. | AC01, AC03, AC08 |
| P8a-A / P8b-A (2026-11-06) | DT9 fuera; archivo E4.5 excluido del primer desarrollo. | AC10, AC13 |

---

## 16. Gates de entrada (antes de aprobar o desarrollar)

- `[CONFIRMADO]` **E4.9 integrado** en `0176ffc` con QA APTO CON RESERVAS; contrato de foto
  y superficie E4.9 estabilizados.
- `[CONFIRMADO]` **E4.10:** D1–D9 y `SIN_CAMBIOS` aprobadas; P1-C/P4-A/P5-B aprobadas.
  Todas las decisiones funcionales de E4.11 están aprobadas.
- `[APROBADO 2026-11-06]` **Decisiones M1–M6** (P1-C/P4-A/P5-B, P2-A, P3-B, P6-A,
  P7-D, P8a-A/P8b-A). El archivo E4.5 queda excluido del primer desarrollo.
- `[PENDIENTE]` **DT6/T-BKP** para cierre real; fixtures para desarrollo y pruebas.
- `[CONFIRMADO]` DT4 no se reabre; se aplica.
- `[CONFIRMADO]` Aprobar SPEC29 no autoriza DEV; el DEV es un gate separado.

---

## 17. Riesgos

| Riesgo | Mitigación candidata |
| --- | --- |
| Recalcular retroactivamente | Consultar solo valores persistidos; etiquetar `Actual` vs `Foto`; probar con fuentes vivas cambiadas tras el cierre. |
| Archivo convertido en foto | **P8b-A:** archivo E4.5 excluido del primer desarrollo; sin ruta, sin totales combinados. |
| Agregados que mezclan versiones sin declararlo | Registrar composición por ciclo/versión/fingerprint; prohibir la mezcla silenciosa. |
| Estado reabierto sin v2 | Regla M1-P4 explícita y coordinada con E4.10 D5. |
| Periodo que cruza frontera | P3-B; no prorratear; atribuir por mes financiado y declarar cobertura/corte; probar 2026→2027. |
| Cobertura parcial presentada como completa | Estados y motivos por bloque; `No disponible` ≠ `0`; no certificar parciales. |
| Pérdida de trazabilidad de versión | Exigir versión, corte, fingerprint y referencia a la foto de ciclo; selector visible. |
| Confusión con E4.7 | Frontera documental: E4.11 aporta evidencia; E4.7 decide métricas y comparación. |
| DT9 por la puerta trasera | Solo lectura; DT9 en SPEC aparte y aprobación explícita. |
