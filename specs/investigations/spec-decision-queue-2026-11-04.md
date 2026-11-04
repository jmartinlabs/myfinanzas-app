# Cola única de decisiones materiales — E4.5, E4.10 y E4.11 (2026-11-04)

> **Documento de coordinación, no de decisión.** Indexa las decisiones ya planteadas por
> las specs e investigaciones vigentes y dice quién debe resolverlas, qué efecto tienen y
> si pueden esperar. **No aprueba, no aplica, no reabre y no sustituye** SPEC20, SPEC28,
> SPEC29, sus testplans ni las investigaciones de origen. No crea reglas financieras, no
> fija cifras nuevas y no declara ningún AC en PASS.

- **Rama:** `docs/spec-next`, base `main` `90cd5dc`. Sin commits.
- **Alcance:** E4.5 (SPEC20), E4.10 (SPEC28) y E4.11 (SPEC29), más sus dependencias
  cruzadas (DT6, DT7, E4.9/v25).
- **Regla de no duplicación:** cada decisión se cita una vez; el texto vinculante sigue
  siendo el de su spec o investigación propietaria. Esta cola solo ordena, no parafrasea
  contratos completos.
- **Leyenda:** `[CONFIRMADO]` = regla de documento aprobado o decisión registrada;
  `[PROPUESTA]` = texto/opción candidata, sin aprobar; `[PENDIENTE]` = decisión o
  evidencia que aún no existe.

**Fuentes:** SPEC20 y su testplan; [QA AC-48…59](e45-qa-ac48-59-2026-11-04.md);
[enmienda C1–C8](e45-amendment-c1-c8-2026-11-04.md); [readiness E4.5](e45-readiness-2026-11-04.md);
SPEC28 y [análisis E4.10](e410-reapertura-analysis-2026-11-04.md); SPEC29 y
[alcance E4.11](e411-fotografias-scope-2026-11-04.md); [tablero](../epic-board.md);
[roadmap](../roadmap.md).

---

## 1. E4.5 — Histórico precontrol

### 1.1 Estado

| Elemento | Estado | Evidencia |
| --- | --- | --- |
| SPEC20 y testplan | `[CONFIRMADO]` aprobados el 2026-10-28; integrados en `3d70fd6` | Cabecera de SPEC20 |
| C1.4 (opción técnica A) | `[CONFIRMADO]` aprobada según el paquete de coordinación; **el texto C1–C8 no está aprobado ni aplicado** | Paquete; ver §7 sobre evidencia |
| Enmienda C1–C8 | `[PROPUESTA]` redactada; ningún cambio aplicado | Enmienda C1–C8, «Control de ejecución» |
| QA AC-48…AC-59 | `[CONFIRMADO]` **NO APTO** con el texto actual; contradicción alta en AC-58 | QA AC-48…59 |
| AC del proyecto | `[CONFIRMADO]` los 59 AC siguen `UNRUN`; la QA no convierte ninguno en PASS | QA; tablero |
| DT7 | `[CONFIRMADO]` abierto | Roadmap; readiness E4.5 |
| DEV E4.5 | `[CONFIRMADO]` no autorizado (`not-ready`) | Tablero |

El tablero resume el frente como «Enmienda C1–C7 + reauditoría»; la propuesta vigente
incluye **C8** como errata independiente del informe de QA, no de SPEC20. No es una
contradicción de fondo, pero la fila del tablero no menciona C8.

### 1.2 Decisión necesaria ahora

`[PENDIENTE]` **Aprobar o rechazar el texto C1–C8** para poder aplicarlo a SPEC20, su
testplan y la cabecera del informe de QA. Es la única decisión de esta cola que bloquea
trabajo documental inmediato.

Condiciones que la aprobación debe dejar explícitas:

1. **C1 y C2 son inseparables:** AC-58 no puede citar el adaptador antes de que exista.
2. **C1.4 A ya está decidida**; la aprobación de C1 no reabre A/B, solo acepta el texto.
   Si la decisión se limitó a alguna de las cuatro filas de C1.4, debe registrarse cuáles;
   no se infiere el resto.
3. **C6 antes que C4/C7:** el gate de AC-48 es presupuesto de AC-49/AC-50.
4. **C8 puede ir en el mismo cambio o en errata separada**, pero no omitirse.
5. **Aprobar el texto no es aplicar:** hace falta un paquete de implementación documental
   con ownership de SPEC20, testplan y el informe de QA, y después una **reauditoría
   independiente de AC-48…AC-59**.

`[CONFIRMADO]` Aprobar C1–C8 **no** cierra DT7, no autoriza DEV, no importa Excel ni datos
reales, no aplica SQL/migración y no convierte ningún AC en PASS.

### 1.3 C1–C8: qué cambia, dónde y qué riesgo tiene

| Cambio | Qué cambia | Archivo / sección | Riesgo si se aplica mal |
| --- | --- | --- | --- |
| **C1** (bloqueante) | Añade el adaptador E4.5 → E2.4: tabla campo a campo, reglas y ampliación mínima propuesta del seam `AnnualSources`/`AnnualHistory`. Declara lo que el contrato real no puede expresar. | SPEC20, `## Consumer contracts` → `### E2.4`, nueva subsección | Dejar dos lecturas de cobertura si no se actualizan `vehiculos.ts` y `plan-anual.test.ts` en el mismo cambio de código; convertir una proyección técnica en decisión funcional encubierta |
| **C2** (bloqueante) | AC-58 deja de probar un «DTO E2.4» inexistente y prueba `annualExecution` con el seam real; se alinea la fila del testplan. | SPEC20 AC-58 + testplan AC-58 | Aplicarlo antes que C1 deja el AC citando campos que el código no tiene; PASS ficticio |
| **C3** (media) | AC-56 fija reloj `2027-01-15` y dos fixtures (30/06 y 31/12) sobre F3-A: 900,00 + 300,00 = 1.200,00; variante con hueco de julio. | SPEC20 AC-56 + testplan AC-56 | Leer los importes ficticios como reales; confundir «cobertura del intervalo» con «cobertura anual» |
| **C4** (media) | AC-50 exige vínculo verificado para `Si`; `Desconocido` deja el total `NoVerificable`; subtotal solo con `evidenciaNoDuplicidad`. | SPEC20 AC-50 + testplan AC-50 | Mapear `Desconocido` a `false` lo suma; mapearlo a `true` lo excluye en silencio |
| **C5** (baja) | AC-53 sustituye «total según cobertura» por estados concretos por Partida y global; `NoDisponible` no se propaga; no se presenta 0. | SPEC20 AC-53 + testplan AC-53 | Presentar un global parcial como completo; convertir ausencia en cero |
| **C6** (baja) | AC-48 añade gate de conflicto/duplicado/solape y acreditación de `representado=No`; caso negativo con `total=null`. | SPEC20 AC-48 + testplan AC-48 | Que un registro con Referencia pendiente sume pese a duplicado/solape, que es lo que D4 prohíbe |
| **C7** (baja) | AC-51 separa completar el mapping de Referencia de reclasificar el registro; AC-52 separa falta de evidencia Q5=A de Referencia pendiente. | SPEC20 AC-51/AC-52 + testplan | Tratar una reclasificación como recálculo silencioso; descartar un registro correcto por una Referencia pendiente o colar uno no acreditado |
| **C8** (baja) | Corrige la cita a readiness: el documento vive en PR #202 y no en el candidato `main`; se marca como no verificado. | Cabecera de `e45-qa-ac48-59-2026-11-04.md` | Citar un documento de PR como evidencia de `main`; inferir su contenido |

`[CONFIRMADO]` Ninguno de los ocho cambios exige código, SQL, migración, datos reales ni
DEV; ninguno altera el recuento de AC.

### 1.4 Lo que esta cola no decide sobre E4.5

- No reabre Q1–Q10, Q5=A, Q7=A, Q10=A ni D4/D14.
- No fija el mapping real, el corte ni las excepciones de DT7.
- No autoriza DEV, importador, Excel, datos reales, migración ni despliegue.
- No convierte la reauditoría en un PASS de aceptación.

---

## 2. E4.10 — Reabrir el último cierre

### 2.1 Estado y dependencia de E4.9

`[CONFIRMADO]` SPEC28 está en **DRAFT**, sin aprobación, sin AC en PASS y sin DEV. Las
decisiones D1–D9 siguen abiertas. `[CONFIRMADO]` E4.9 está aprobada como spec, pero su
DEV sigue en el PR **#200** (`OPEN`, draft), con DEV-05 «APTO CON RESERVAS» y el conjunto
pendiente; no hay merge ni QA final del conjunto. `[CONFIRMADO]` v25 está reservada en
exclusiva a E4.9.

`[PENDIENTE]` Mientras E4.9 no esté mergeado y con QA, no se pueden congelar en SPEC28:
rutas canónicas, forma de la reapertura (evento/tabla/estado/versión), tabla de auditoría,
campos de vínculo v1→v2 ni política de versiones. La SPEC puede redactarse parametrizada,
pero no aprobarse como contrato estable.

### 2.2 D1–D9: opciones y recomendación existente

| # | Decisión | Opciones ya planteadas | Recomendación existente | Tipo |
| --- | --- | --- | --- | --- |
| **D1** | Si un ciclo reabierto y sin v2 sigue ocupando la posición de «último» | A) la reserva hasta re-cierre/cancelación; B) deja de ser último y el anterior pasa a serlo; C) compromiso obligatorio de re-cierre | `[PROPUESTA]` A, para evitar dos ventanas abiertas | **Usuario** (material) |
| **D2** | Alcance T1 de la ventana de rectificación | A) solo T2, T1 sigue bloqueado; B) T1 solo en la ventana del ciclo hasta re-cierre/cancelación; C) T1 con ventana temporal y re-bloqueo automático | `[PENDIENTE]` sin recomendación; es la decisión de mayor impacto | **Usuario** (material) |
| **D3** | Motivo y actor | A) motivo solo al reabrir, el re-cierre lo hereda; B) motivo separado en reapertura y re-cierre; C) actor fijo `usuario-unico`, sin roles nuevos | `[PROPUESTA]` C es coherente con la app privada; A/B sin recomendar. No se inventa un mínimo distinto del ya usado por E4.9 (hasta 1000 caracteres) | **Usuario** (material) + detalle técnico (longitud, trim, dónde se muestra) |
| **D4** | Revalidación de dependencias posteriores | A) bloquear si hay cualquier cierre posterior; B) revalidar en lectura y bloquear si hay contradicción; C) revalidar y avisar con auditoría | `[PENDIENTE]` C no se adopta por defecto; AC-20 no se amplía por analogía | **Usuario** (material) |
| **D5** | Versión vigente y agregados mientras el ciclo está reabierto | A) v1 sigue vigente y los agregados se bloquean o marcan; B) el agregado usa v1 y queda congelado; C) se regenera con v2 | `[PENDIENTE]` sin recomendación; debe coordinarse con E4.11 (P1/P4/P5) | **Usuario** (material, conjunta con E4.11) |
| **D6** | Plan final y auxiliares al reabrir/re-cerrar | A) se conserva v1 y se edita el plan vivo; v2 captura el vigente; B) se bloquea el plan y v2 repite v1; C) se permite cambiar `SinPlan`/`Capturado` con motivo | `[PENDIENTE]` sin recomendación | **Usuario** (material) |
| **D7** | Idempotencia y concurrencia observable | A) reutilizar el patrón de `cierre_attempts` con clave propia; B) exigir versión/estado esperado y 409; C) serializar por ciclo con transacción `IMMEDIATE` | `[PENDIENTE]` sin recomendación; los nombres y códigos dependen de E4.9 | **Técnica** (mecanismo) + **usuario** (comportamiento observable) |
| **D8** | Fallo, cancelación y recuperación | A) reapertura atómica y quedarse reabierto; B) cancelación explícita que vuelve a `Cerrado` sin v2; C) reapertura y re-cierre en una sola operación | `[PENDIENTE]` sin recomendación; B es condicional | **Usuario** (material) |
| **D9** | Ciclos antiguos (DT9) | A) E4.10 solo alcanza al último cierre y DT9 queda fuera; B) modo excepcional para ciclos antiguos | `[CONFIRMADO]` A por P5/DT9; solo falta confirmar el límite, no elegir B | **Usuario** (confirmación) |

`[CONFIRMADO]` Estas decisiones no se resuelven en código ni por el desarrollador. Aprobar
SPEC28 no autoriza DEV.

### 2.3 Qué es decisión de usuario y qué es técnica

- **Material (usuario):** D1, D2, D3 (fondo), D4, D5, D6, D8 y el comportamiento observable
  de D7.
- **Técnica, dependiente de E4.9:** forma de la reapertura, tabla/evento de auditoría,
  nombres de rutas, códigos de error, clave de idempotencia y forma exacta del fingerprint
  de v2. No se congelan aquí; se proponen después de QA/merge.
- **Confirmación, no nueva decisión:** D9-A y el límite de DT9.

---

## 3. E4.11 — Fotografías de ciclo/trimestre/año

### 3.1 Estado y dependencias

`[CONFIRMADO]` SPEC29 está en **DRAFT**, sin aprobación ni revisión de Álex registrada,
sin AC en PASS y sin DEV. `[CONFIRMADO]` DT4 ya está resuelta (contenido, metadatos,
v1/v2, retención permanente) y no se reabre.

`[PENDIENTE]` E4.11 no puede aprobarse antes de que E4.10 fije su política de versiones y
estado, y antes de que E4.9 esté mergeado/QA. La SPEC puede prepararse parametrizada, pero
el contrato de consulta no es estable sin M1–M6.

### 3.2 P1–P8 agrupadas en M1–M6

| Bloque | Decisiones | Opciones ya planteadas | Recomendación existente | Tipo |
| --- | --- | --- | --- | --- |
| **M1** | **P1** versión que compone; **P4** ciclo reabierto sin v2; **P5** mezcla de versiones | P1: A última cerrada / B versión explícita / C declarar la usada / D solo v1 y bloquear. P4: A excluir y marcar / B usar v1 marcada / C bloquear. P5: A prohibir mezcla / B permitir y registrar / C un agregado por combinación | `[PROPUESTA]` P1: C mínimo obligatorio + B disponible; P4: A coordinada con D5 de E4.10; P5: B con composición registrada | **Usuario** (material; P1/P4/P5 no se separan) |
| **M2** | **P2** agregado persistido, vista determinista o híbrido | A) foto de periodo con versión/fingerprint; B) vista determinista sobre fotos inmutables; C) híbrido | `[PROPUESTA]` A solo si «congelado» (DT4) exige artefacto persistido; B es la alternativa mínima; C solo si A y B no bastan | **Usuario** (fondo) + **técnica** (mecanismo y esquema) |
| **M3** | **P3** periodo, frontera y continuidad | Periodo: A calendario / B ciclo financiero / C ambos / D solo ciclo y año. Cruce: A por `Fin` / B por solapamiento / C solo contenido / D prorrateo. Sin cierre: A excluir con motivo / B bloquear. Continuidad: A inmutable / B transición / C reetiquetar | `[PROPUESTA]` A; cruce A sin prorrateo; sin cierre A con `Parcial`; continuidad A+B sin reetiquetar | **Usuario** (material) |
| **M4** | **P6** retención | A) permanente para fotos y agregados; B) permanente para fotos, agregados regenerables; C) poda | `[PROPUESTA]` A; B solo si M2-B; C no recomendada | **Usuario** (confirmación de alcance) |
| **M5** | **P7** consulta y selección | A) por ciclo/versión; B) por trimestre/año; C) por corte; D) combinación con selector | `[PROPUESTA]` D por fases A → B, con `seleccionAplicada` visible | **Usuario** (UX/criterio) + **técnica** (API) |
| **M6** | **P8** DT9; límites del archivo E4.5 | P8: A no habilitar / B solo con SPEC propia. Archivo: A excluirlo / B vista separada / C combinarlo en totales | `[CONFIRMADO]` P8-A. Archivo: B solo si E4.5 tiene DEV/DT7 y frontera de consulta; si no, A; C prohibida | **Usuario** (confirmación) + **técnica** (frontera) |

`[CONFIRMADO]` DT4 exige registrar la versión usada y congelar el agregado: declarar la
composición no es opcional con ninguna opción. `[PROPUESTA]` La frontera E4.11/E4.7
(quién define métricas anuales) sigue pendiente y debe resolverse en la SPEC o en una nota
aprobada.

### 3.3 Qué es decisión de usuario y qué es técnica

- **Material (usuario):** P1, P2, P3, P4, P5, P6, P7 y la confirmación de P8; en especial
  P3 (periodo) y P2 (agregado persistido vs vista), que cambian el contrato de consulta.
- **Técnica:** forma de la respuesta, rutas ilustrativas, índice de versiones, mecanismo de
  congelación si se aprueba P2-A y necesidad de versión de esquema propia.
- **Coordinada con E4.10:** D5 ↔ P1/P4/P5. No se puede aprobar una SPEC sin la otra regla.

---

## 4. Dependencias cruzadas

### 4.1 Qué depende de qué

| Dependencia | Estado | Qué bloquea | Qué no bloquea |
| --- | --- | --- | --- |
| **E4.5 / DT7** | `[CONFIRMADO]` DT7 abierto | DEV de E4.5, mapping real, importación y totales con datos reales | La enmienda documental C1–C8 y la reauditoría con fixtures ficticias |
| **E4.9 / v25** | `[CONFIRMADO]` v25 exclusiva de E4.9; PR #200 OPEN/draft; QA del conjunto pendiente | Congelar rutas, auditoría, estados y política de versiones en SPEC28/SPEC29 | Redactar ambas specs parametrizadas y preparar sus decisiones |
| **E4.10 / E4.11** | `[PENDIENTE]` D5 ↔ P1/P4/P5 | Aprobación de SPEC28 y de SPEC29 | Documentar opciones y recomendar sin decidir |
| **DT6 / T-BKP** | `[CONFIRMADO]` abierto: sin destino externo ni restauración real probada | Cierre real, AC-09, activación productiva, E4.12/P7 | DEV y pruebas con fixtures; todo el trabajo documental |
| **DT9** | `[CONFIRMADO]` no habilitado hasta SPEC propia | Rectificación de ciclos antiguos y su efecto en agregados | E4.10 limitada al último cierre y E4.11 de solo lectura |
| **E4.5 / E4.11** | `[PROPUESTA]` solo si se aprueba M6-B | La vista separada del archivo en E4.11 | El núcleo de E4.11 sobre fotos de E4.9/E4.10 |

### 4.2 Preparación vs cierre

| Frente | Se puede preparar ahora | Se bloquea hasta |
| --- | --- | --- |
| **E4.5** | Aplicar C1–C8 tras aprobación y reauditar AC-48…AC-59 | Cierre de QA: reauditoría sobre el texto enmendado. DEV/real: DT7 |
| **E4.10** | SPEC28 borrador y análisis D1–D9 | Aprobación de SPEC28: E4.9 mergeado/QA + D1–D9 |
| **E4.11** | SPEC29 borrador parametrizado | Aprobación de SPEC29: E4.10 con política de versiones + P1–P8 |
| **E4.12** | Requisitos y matriz de recuperación | DT6/DT7 y specs previas |
| **v25** | Nada nuevo: ya está asignada a E4.9 | E4.10/E4.11 no reservan versión hasta después de v25 |

---

## 5. Propuestas candidatas a aprobación (máximo 3)

| # | Propuesta | Estado | Qué falta para aprobar | Siguiente acción |
| --- | --- | --- | --- | --- |
| **1** | **E4.5 · texto C1–C8** | `[PROPUESTA]`; C1.4 A confirmada; **no aplicado** | Aprobación del usuario; registrar la evidencia de C1.4 A | Aprobar; después, paquete documental que aplique C1–C8 a SPEC20/testplan y C8 a la cabecera de QA; después, reauditoría AC-48…AC-59 |
| **2** | **E4.10 · SPEC28** | `[PROPUESTA]` DRAFT; no aprobable todavía | E4.9 mergeado/QA; D1–D9 (6 bloques); DT9 fuera; versión de esquema posterior a v25 | Decidir los 6 bloques cuando E4.9 esté estable; finalizar y revisar SPEC28 |
| **3** | **E4.11 · SPEC29** | `[PROPUESTA]` DRAFT; no aprobable todavía | E4.9 estable; E4.10 con política de versiones; P1–P8 (M1–M6); frontera E4.7 | Alinear P1/P4/P5 con D5; decidir M1–M6; finalizar SPEC29 |

`[CONFIRMADO]` Ninguna de las tres autoriza DEV por sí sola. La 1 es documental; las 2 y 3
son specs candidatas, no contratos vigentes.

---

## 6. Lo que puede esperar

`[PROPUESTA]` Orden de trabajo recomendado, sin decidir por el usuario:

1. **No puede esperar:** aprobar C1–C8 y reauditar AC-48…AC-59. Es el único trabajo
   documental desbloqueado que no depende de E4.9.
2. **Puede esperar:** D1–D9 y P1–P8. No cambian por esperar, pero **D5 y P1/P4/P5 deben
   decidirse juntas** antes de aprobar SPEC28 o SPEC29.
3. **Puede esperar:** DT6. No bloquea documentación, DEV con fixtures ni QA documental;
   bloquea cierre real, AC-09, activación productiva y E4.12/P7.
4. **Puede esperar:** DT7. No bloquea la enmienda ni la reauditoría; bloquea DEV, mapping
   real, importación y totales con datos reales.
5. **Puede esperar:** la forma técnica de la reapertura y de las rutas, hasta QA/merge de
   E4.9. No se congela por inferencia.
6. **No puede esperar si se quiere aprobar SPEC28/29:** E4.9 mergeado/QA y la coherencia
   D5 ↔ P1/P4/P5.

---

## 7. Control de ejecución y límites

- Documento nuevo; **no se ha modificado** SPEC20, SPEC28, SPEC29, sus testplans, el
  tablero, la enmienda C1–C8 ni el informe de QA.
- Sin commits, sin push, sin datos reales, sin Excel, sin código, sin SQL y sin verificación
  funcional.
- `[CONFIRMADO]` La aprobación de C1.4 A consta en el paquete de coordinación, pero **no se
  ha localizado un acta o commit en este worktree**. Antes de aplicar C1 conviene registrarla
  (tablero o comentario de PR) para que la trazabilidad no dependa de la memoria de sesión.
  No se reabre la decisión ni se infiere para C1.5.
- `[CONFIRMADO]` La cita a readiness de la QA sigue siendo la del candidato `main`
  `0b8aade`; C8 corrige precisamente esa cita y no se aplica aquí.

---

## 8. Decisión → dueño → efecto → puede esperar

| Decisión | Dueño | Efecto | Puede esperar |
| --- | --- | --- | --- |
| Aprobar el texto C1–C8 (E4.5) | Usuario | Habilita aplicar la enmienda a SPEC20/testplan y reauditar AC-48…AC-59 | **No** |
| Registrar la evidencia de C1.4 A | Coordinador, con confirmación del usuario | Deja trazabilidad de la opción técnica ya decidida | **No** |
| Aplicar C1–C8 y C8 | Implementación documental autorizada | SPEC20/testplan enmendados; QA corregida | **No** |
| Reauditar AC-48…AC-59 | QA/revisión independiente | Veredicto sobre el texto enmendado; no cierra DT7 ni autoriza DEV | **No** |
| DT7 (mapping/corte/excepciones) | Usuario, con evidencia privada | Desbloquea DEV, importación y totales reales de E4.5 | Sí |
| QA/merge de E4.9 y v25 | QA + usuario (merge) | Estabiliza contrato, rutas, auditoría y versión para E4.10/E4.11 | Sí para documentación; **no** para aprobar SPEC28/29 |
| D1 — reserva de «último» | Usuario | Define si puede haber dos ventanas abiertas | Sí, hasta E4.9 estable |
| D2 — alcance T1 | Usuario | Decisión material de integridad histórica; define qué se rectifica | Sí, pero antes de aprobar SPEC28 |
| D3 — motivo/actor | Usuario (+ detalle técnico) | Contrato de auditoría de reapertura y re-cierre | Sí |
| D4 — revalidación posterior | Usuario | Bloqueo o aviso ante dependencias contradictorias | Sí |
| D5 ↔ P1/P4/P5 — versión vigente y agregados | Usuario | Regla común E4.10/E4.11; no se puede aprobar una SPEC sin la otra | **No se pueden separar**; sí hasta E4.9 |
| D6 — plan y auxiliares | Usuario | Qué se puede rectificar en v2 y qué se compara con v1 | Sí |
| D7 — idempotencia/concurrencia | Usuario (observable) + técnico | Evita v2/v3 duplicadas y carreras | Sí |
| D8 — fallo/cancelación | Usuario | Permite o prohíbe quedarse reabierto o cancelar sin v2 | Sí |
| D9 — límite de ciclos antiguos | Usuario (confirmación) | Excluye DT9 de E4.10 | Sí |
| Aprobar SPEC28 (E4.10) | Usuario | Habilita preparar DEV de E4.10, que sigue siendo un gate aparte | Sí |
| P1/P4/P5 — composición y reabierto | Usuario | Regla de versión por ciclo y marca de reabierto | Sí, pero junto con D5 |
| P2 — agregado persistido o vista | Usuario (fondo) + técnico | Decide si hay artefacto persistido y posible esquema nuevo | Sí |
| P3 — periodo y frontera | Usuario | Define trimestre/año y qué pasa al cruzar diciembre | Sí |
| P6 — retención del agregado | Usuario | Confirma permanencia también para agregados | Sí |
| P7 — consulta y selección | Usuario (+ API) | Define la primera capacidad de consulta y el selector de versión | Sí |
| P8 — DT9 y archivo E4.5 | Usuario (confirmación) | Mantiene DT9 fuera y decide si E4.5 se muestra | Sí |
| Aprobar SPEC29 (E4.11) | Usuario | Habilita preparar DEV de E4.11, que sigue siendo un gate aparte | Sí |
| DT6/T-BKP | Usuario | Desbloquea cierre real, AC-09, activación productiva y E4.12/P7 | Sí |
| Versión de esquema de E4.10/E4.11 | Usuario, después de v25 | Reserva de esquema; no se asume v25 ni v26 | Sí |
