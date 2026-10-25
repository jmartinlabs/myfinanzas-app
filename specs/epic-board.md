## Estado vigente — 2026-10-25 — adopción v2.9.0

- Harness v2.8.0 integrado PR66/main `10bb794`; candidato `ee2f431`. CI [candidato40173694194](https://github.com/josemartin2000/myfinanzas-app/actions/runs/40173694194) y [main40174086170](https://github.com/josemartin2000/myfinanzas-app/actions/runs/40174086170) SUCCESS según entregable externo, no reconsultados en esta adopción; QA documental externa favorable con CI UNRUN por falta de acceso.
- Autorización vigente: actualización local Standard v2.9.0 y validaciones/QA independiente, sin merge/deploy. Rama `codex/adopt-harness-v290`, base `10bb794`, fuente `781ffbb`. [Plan/evidencia](methodology/orchestration-adoption.md#harness-v290--adopción-local). Baseline PASS (57/24/9/8/15 regresiones) y H290-QA independiente PASS del diff14rutas; selección efectiva QA `gpt-6.1-sol` + `low` verificada en metadatos. OpenCode deshabilitado en esta ejecución.
- Dev12 autorizado: usuario «Autorizo dev12 conforme a la especificación y wireframes aprobado». Checkout externo principal MyFinanzas, rama `codex/dev12-flujo-mensual`, HEAD observado `bb24934`, limpio al preflight. Candidato no revisado aquí; QA independiente pendiente, sin merge.
- Spec13/E3.1 autorizada solo especificación: usuario «Autoriza preparar la especificación E3.1, sin desarrollo». Worktree externo aislado `myfinanzas-spec13-opencode` (ruta local en paquete del usuario), base observada `10bb794`; contenido/progreso externo no verificado. No se inicia ni controla OpenCode desde esta ejecución; inicio/parada del cliente externo corresponden al usuario.
- Cuota inicial63%/79%, mínimo63%; techo subagentes `gpt-6.1-sol` + `low` con contexto nuevo. Sin autorización inferida al alcanzar umbrales25%/5%.
- Siguiente acción: revisar commit local v2.9.0; publicación/PR no realizada, full Linux UNRUN y merge sin autorización. Cuota antes de QA54%/77%, sin excepción necesaria; umbrales reales25%/5%, OpenCode y handoff entre chats UNRUN. No aplicación/SQL/Excel/deploy, cambios en plantilla fuente ni investigación B3/Dev32.

Los apartados inferiores son historia conservada; este resumen sustituye sus etiquetas vigentes.

---

## Estado vigente — 2026-10-25

- Aplicación: dev11/E2.5 integrada por PR63 en main `ed4a272`; candidato validado
  `7d24a7f`, CI40128422924 SUCCESS. [Cierre/evidencias](11-nomina-prevision-progress.md#cierre-vigente--2026-10-24).
- Spec12 completa/wireframes/56AC aprobados e integrados PR65/main `42a3efe`; dev12
  no autorizado. [Spec](12-flujo-mensual-specification.md) / [registro](12-flujo-mensual-brainstorming.md).
- Piloto operativo integrado PR64/`467c11a`; mantiene medición y límites locales.
- Trabajo vigente autorizado: adopción v2.8.0/`a451dff`, rama `codex/adopt-harness-v280`.
  [Alcance/procedencia](methodology/orchestration-adoption.md#harness-v280--adopción-local).
- Baseline y23 regresiones del validador PASS; QA independiente H280-QA PASS.
- Próximo: publicar candidato/PR y validar full CI Linux; merge exige aprobación propia.
- Sin aplicación/SQL/Excel/deploy, cambios en plantilla fuente o investigación B3/Dev32.

Los apartados inferiores son historia conservada; no recargarlos para conocer el estado actual.

---

## Dev11 — PR63 en borrador, fixture corregida tras CI — 2026-10-24

PR63/head5979731: baseline PASS, API167 PASS/1 FAIL en fixture P11 producción:
S001 demo no existe en producción. Destino ahora creado explícitamente mediante
servicio existente, sin cambiar código de aplicación ni quitar assertions. Regresión
P22 y C1 final22 PASS/156 assertions; tipos y revisión independiente del delta PASS.
[Progreso/evidencias](11-nomina-prevision-progress.md). Publicar corrección y esperar
CI Linux completa; no merge/dev12/Excel/deploy. Estados inferiores son hitos históricos.

---

## Dev11 — candidato local y QA conformes, CI Linux pendiente — 2026-10-24

[Progress11](11-nomina-prevision-progress.md) / [testplan46AC](11-nomina-prevision-testplan.md).
Un ejecutor, QA independiente PASS tras resolver carreras UI/corte y contexto ABA.
Focal21 PASS/152 assertions; tipos/build PASS. C2 final1 PASS(3,7s), impacto desde
Movimientos, async/conflictos y capturas390/1440 inspeccionadas; contraste mínimo6,04:1.
Baseline PASS. Application local NO PASS: API120PASS/43FAIL en macOS (libc/operación
Linux), global E2E UNRUN; no omitir guardas. CI Linux/restore pendientes. Rama
`codex/dev11-nomina-prevision`, base `1cf13b4`; preparar commit/PR de candidato.
Sin merge, Excel real, deploy, plantilla o investigación B3/Dev32.

---

## Dev11 — E2.5 autorizado y en curso — 2026-10-24

Fuente: usuario «Autorizo», respuesta inmediata al único gate de desarrollo dev11,
tras integración aprobada de spec11/wireframes PR62 en main `1cf13b4`.
Rama `codex/dev11-nomina-prevision`, checkout limpio de partida. Alcance: implementar
[spec11 rev3](11-nomina-prevision-specification.md), incluidos persistencia propia,
API y UI, con los 46 AC aprobados y datos exclusivamente ficticios.
Un ejecutor y QA independiente al candidato; pruebas focales por incremento y
verificación canónica del candidato, sin reinstalaciones o rondas redundantes.
Mantener separados histórico/documentación, banco y pronóstico. No reabrir Q1–Q6/M1.
Sin Excel real, despliegue, cambios de plantilla, B3/Dev32 ni merge por inferencia.
Progreso/testplan11 recogerán cobertura real y bloqueos; ningún AC fallido se difiere
como contrato futuro. La publicación/PR sigue la política Git; merge exige aprobación.

---

## Spec11 — rev3, relación N:M y wireframes aprobados — 2026-10-24

Fuente real: «Aprobadas», respuesta inmediata a solicitud única de spec11 rev3 completa,
incluida relación técnica N:M y wireframes. [Spec11](11-nomina-prevision-specification.md) /
[registro11](11-nomina-prevision-brainstorming.md). Q1–Q6/M1 cerradas;46 AC futuros.
Candidato aprobado SHA256 `c35beb2dac62ad0898b2dafd857138a91806309e235ea755670953cf6fe157f8`;
solo actualizados estado/fuente de aprobación, sin cambiar reglas/diseños. QA documental
independiente conforme, sin implementación o equivalencia numérica del Excel acreditadas.
Rama `codex/spec11-nomina-prevision`, base main `e1d6dba` verificada. Preparar PR documental;
checks y autorización de merge propios. Dev11 no autorizado; tampoco SQL/Excel/deploy.
No reanudar B3/Dev32 ni cambiar plantilla. Los hitos inferiores conservan historia.

---

## Spec11 — Neto documentado aceptado, propuesta completa rev3 — 2026-10-24

Fuente: usuario «E2.5 — Decisión sobre Neto documentado y conciliación».
[Brainstorming11](11-nomina-prevision-brainstorming.md) registra M1 resuelto;
[spec11 rev3](11-nomina-prevision-specification.md) incorpora captura opcional con
evidencia, Histórico independiente y conciliación con referencia válida/discrepancias.
Comprobación de reutilización actual:sin campo Nómina/Neto documentado semánticamente
idéntico instalado; antes de implementar revalidar fuentes, sin cambiar esquema ahora.
Q1–Q6/M1 sin preguntas pendientes.46 AC futuros; diseño técnico N:M, protocolos y
wireframes rev3 pendientes de aprobación completa. Sin desarrollo/SQL/Excel/merge.
Revisión independiente SPEC11-DOC-QA PASS del delta, sin nuevos conflictos materiales.
Candidato rev3 SHA256 `c35beb2dac62ad0898b2dafd857138a91806309e235ea755670953cf6fe157f8`.
Estructura/enlaces/whitespace PASS;46 IDs AC únicos y bloques de wireframes equilibrados.
No tests funcionales, instalaciones o CI. Próximo paso:aprobación completa rev3,
incluida relación técnica N:M y wireframes; no desarrollo/SQL/Excel/merge por inferencia.

---

## Spec11 — resolución Q4–Q6 integrada en rev2 — 2026-10-24

Fuente: usuario «E2.5 Nómina — Resolución de decisiones adicionales Q4–Q6».
[Brainstorming11](11-nomina-prevision-brainstorming.md) conserva rondas y respuestas;
[spec11 rev2](11-nomina-prevision-specification.md) separa físico/limitaciones/app.
N:M conceptual aceptada; diseño técnico por IDs/importes y diferencia con C176 explícitos.
Fórmulas salariales/prudente y validaciones propuestas recibidas, sin inventar nuevo
motor fiscal.40 AC futuros y wireframes rev2. M1 fuente/captura de Neto documentado
sin histórico y desempate de formato monetario expuestos antes de cierre completo.
Sin aprobación completa/visual/estructural, desarrollo, SQL, Excel o merge.
QA independiente SPEC11-DOC-QA PASS con límites, sin nuevos conflictos materiales.
Formato final explicitado como propuesta técnica, sin afirmar equivalencia numérica.
M1 es el único cierre material pendiente: aceptar fuente/captura opcional del neto
documentado o mantener no disponible si falta original. Sin nueva confirmación Q1–Q6.
Estructura/enlaces y whitespace PASS; no suites funcionales ni instalaciones.
Próximo hito: resolver M1 y presentar especificación/wireframes completos para aprobación.

---

## Spec11 — Q1–Q3 confirmadas y propuesta rev1 — 2026-10-24

Fuente real: usuario «E2.5 — Nómina: decisiones funcionales Q1–Q3», contraste de Álex
atribuido a hoja Nómina/tablas/Criterios v5.11(7), sin inspección propia.
[Brainstorming11](11-nomina-prevision-brainstorming.md) conserva ronda1 y respuestas;
[spec11 rev1](11-nomina-prevision-specification.md) desarrolla vínculo mínimo propuesto,
casos parciales/múltiples/fuera de mes, fórmulas de previsión y wireframes provisionales.
Q4 cardinalidad/abonos agrupados, Q5 derivados/referencias y Q6 prudente/precisión
pendientes. Q1–Q3 no se reabren. No modelo estructural aprobado, SQL, desarrollo,
Excel, merge ni nuevo motor fiscal. Un ejecutor, controles documentales proporcionales;
próximo paso: resolver solo esos complementos antes de cerrar vínculos/cálculos.

---

## Spec11 — E2.5 iniciada, ronda1 pendiente — 2026-10-24

Usuario: «Inicia» / «Venga empieza», en contexto único de spec11. Main verificado
`e1d6dba`, dev10 integrado por PR61 tras «Apruebo merge»; checkout limpio de partida.
[Brainstorming11](11-nomina-prevision-brainstorming.md), rama codex/spec11-nomina-prevision.
Contratos R3 y roadmap conservados; Q1 unidad/campos históricos, Q2 atribución de
cobros y Q3 entradas/fórmulas de previsión pendientes. Sin reglas fiscales inventadas.
Sin aprobación de especificación/wireframes, desarrollo, SQL, Excel o merge.
Un ejecutor, sin delegación ni suites funcionales para abrir esta ronda. Próximo paso:
recibir respuestas funcionales y preparar diseño documental, sin reabrir Ciclos/R3.
Los estados dev10 inferiores son hitos históricos: CI de PR61 pasó147 API/4E2E;
B3 pasó esa ejecución, incidencia intermitente no cerrada. No se reanuda investigación.

---

## Dev10 — autorizado y en curso — 2026-10-24

Fuente real: usuario «Autorizo», respuesta inmediata al único siguiente alcance
pendiente, desarrollo de dev10 tras integrar spec10/PR60. Base main `72833b9`.
[Spec10 rev2](10-plan-anual-specification.md) y wireframes aprobados; Q1–Q6 cerradas.
Rama `codex/dev10-plan-anual`; un ejecutor, QA independiente al candidato.
Ownership código/tests/progress10/testplan10/arquitectura del ejecutor; tablero del
coordinador. Prerrequisitos: Python3.12/Bun1.4.3/age/navegador ya disponibles; no repetir
instalaciones sin necesidad. MacOS no acredita las guardas Linux; full en CI Linux.
Sin merge, Excel real, despliegue, reanudación B3/Dev32 ni cambio de plantilla.
Próximo hito: incrementos verificables, matriz34 AC actuales frente a contratos futuros
expresos (histórico/cierres/consumidores no instalados), sin reclasificar fallos actuales.

Hito I1 del ejecutor: esquema11/API anual/motor/UI conectados, typecheck PASS.
Focales, continuidad y E2E/visual aún en curso; no candidato final ni PASS global.
Revisión temprana del coordinador detecta parseo con límite individual int64 aplicado
al agregado ejecutado (corrección solicitada) y revisa el corte temporal adicional
por reloj. Sin cambios concurrentes al código ni reinterpretar decisiones financieras.

Hito candidato1: ocho focales83 aserciones, tipos/build PASS por ejecutor. QA10
independiente encuentra preview sin derivados/importes y ciclos sobraincluidos; P2
pendiente de corrección, con probe SQLite propio. E2E coordinador ejecutado:1 FAIL6,2s
porque tras MFA el recorrido no navega desde Saldos a Plan anual; corrección de fixture,
no cambio de autenticación. Capturas y aceptación aún pendientes. Un intento de browser
del ejecutor quedó en permiso sin ejecutarse (~8min); se interrumpió y root asume el gate.
No declarar que esa espera es tiempo de tests ni duplicar una suite no iniciada.

Hito local final:9 focales91asserts y tipos/build PASS del autor; P2 QA cerrado con
probe independiente7asserts, sin nuevos hallazgos. B final1PASS2,1s/3,4s ejecución,
tras4FAIL de fixture (navegación/selectores). Capturas390/1440 inspeccionadas; corregida
superposición de columnas heredadas; contraste efectivo mínimo5,81:1. Se añade solo
allowlist PNG e2-4 en CI para evidencia funcional, sin cambiar gates/plantilla.
Baseline único PASS; pendiente full Linux con P11restorev11 al publicar. Evidencia
remota por SHA/run en checks/resumen de la PR, sin commit de auto-registro que repita
full innecesariamente. No aceptación global/merge antes del gate.

---

## Spec10 — rev2 y wireframes aprobados — 2026-10-24

Fuente real: «Aprobadas», respuesta inmediata a la solicitud única «¿Apruebas la
especificación completa rev2 y sus wireframes?». Q1–Q6 confirmadas;34 AC futuros.
[Spec10](10-plan-anual-specification.md) y [registro](10-plan-anual-brainstorming.md).
QA documental independiente PASS sobre candidato SHA256
`d38a51e2c2e563e02819aed8cd4d49c132ec494c0f5397e5966b8abd853a1b95`;
actualización administrativa de estados, sin cambio de reglas/diseños aprobados.
Rama `codex/spec10-plan-anual`, base main `5c3e49b`. Preparación de PR documental;
no desarrollo autorizado, SQL, migración, Excel, merge, B3 ni Dev32.
Próximo gate: revisión/CI documental y aprobación específica de merge de la nueva PR.
Tras integrar, dev10 seguirá requiriendo autorización propia. Piloto solo local;
ningún cambio a la plantilla ni afirmación de ahorro causal.

Piloto — balance de preparación/revisión hasta solicitar aprobación: tres turnos
cerrados (01a16e55,01a16e5f,01a16e68; IDs completos en hitos inferiores), sin duplicar
respuestas: coordinador21 respuestas/entrada5239991/caché incluida5209344/salida24347;
QA independiente3 respuestas/entrada117275/caché incluida102528/salida322.
Fuente collect existente; excluye registro/publicación de esta aprobación y trabajo futuro.
Un ejecutor y un paquete QA acotado; cero hallazgos bloqueantes documentales; sin
instalaciones, suites funcionales locales ni cambios de plantilla. Controles documentales
por revisión; baseline final de publicación PASS una vez, sin cambios de aplicación.
Bloqueo operativo inicial de rama204,386s ya registrado, sin atribuirlo todo a humano.
Q1–Q6 no se reabren tras confirmarse. Mantener piloto en fase documental; muestra sin
comparación homogénea para probar ahorro causal ni reducción de defectos funcionales.
Dev10 no autorizado: evaluación funcional pendiente, no extrapolar estos datos.

---

## Spec10 — Q1–Q6 confirmadas, revisión completa rev2 — 2026-10-24

Fuente: usuario «Spec10 — Resolución Q4–Q6 por Álex»; registro append-only en
[brainstorming10](10-plan-anual-brainstorming.md). [Spec10 rev2](10-plan-anual-specification.md)
incorpora Diferencia redondeada, fecha histórica/Gastos, agregado esencial incompleto,
protección de ciclos/fotografías e inactivos. Wireframes rev2 y34 AC futuros.
Sin preguntas Q1–Q6 abiertas. Documento completo y wireframes NO aprobados todavía.
Sin desarrollo, SQL, migración, Excel, merge ni reanudación B3. Próximo paso: QA
completa por el usuario. Fuentes físicas atribuidas al contraste de Álex, no inspección
propia. Se preservan los hitos inferiores.

QA independiente SPEC10-DOC-QA: PASS documental, sin hallazgos bloqueantes; lectura de
specification completa y respuestas confirmadas, sin pruebas funcionales ni escrituras.
Candidato rev2 SHA256: `d38a51e2c2e563e02819aed8cd4d49c132ec494c0f5397e5966b8abd853a1b95`.
Control estructural/enlaces y whitespace PASS, una ejecución; sin suites de aplicación,
instalaciones, escalaciones ni CI. No acreditar implementación ni aceptación visual.
Piloto, corte parcial UTC 2026-10-24T15:00:02+00:00, turno `01a16e68-48df-73f2-b1ef-2be6690a0b74`:

- /root (gpt-6.1-sol): 5 respuestas, entrada 1328571, caché incluida 1320832, salida 8982.
- /root/qa_spec10_doc (gpt-6.1-sol): 3 respuestas, entrada 117275, caché incluida 102528, salida 322.

Corte de registros existentes, excluye respuestas posteriores; QA detectados0 en esta revisión documental, no evidencia de ausencia de defectos funcionales. Sin atribuir ahorro causal.

---

## Spec10 — Q1–Q3 confirmadas, propuesta rev1 — 2026-10-24

Fuente: mensaje del usuario «Spec10 — Decisiones funcionales de Álex para E2.4 Plan anual».
[Brainstorming10](10-plan-anual-brainstorming.md) conserva ronda1 y añade respuestas;
[spec10 rev1](10-plan-anual-specification.md) propone contratos, wireframes y24 AC futuros.
Presupuesto anual manual único; Periodo previsto texto; Esencial Sí/No/Pendiente y
suma anual/12 confirmados. R3/R6 revisadas: equivalente anual no es coste global,
no doble cómputo ni sobrescritura del Esencial manual del ciclo. Evidencia Excel atribuida.
Pendientes nuevos Q4 derivados, Q5 agregado incompleto y Q6 edición pasada/inactivos.
Sin aprobación completa/visual, desarrollo, SQL, Excel, merge ni reanudación B3.
Piloto, corte parcial24/10 16:50:04 Madrid, turno `01a16e5f-8966-7221-861a-7a4ef838ca56`:
coordinador gpt-6.1-sol,4 respuestas,entrada987075,caché incluida979840,salida8499.
Fuente collect existente; excluye respuestas posteriores. Sin subagentes, instalaciones,
CI ni nuevas escalaciones. Un validate-template PASS y whitespace PASS; cero repeticiones.
QA independiente/hallazgos N/D hasta candidato completo. Sin comparación causal de ahorro.
Un ejecutor; siguiente paso: revisión Q4–Q6 antes de aprobación completa.

---

## Spec10 — ronda1 documental abierta — 2026-10-24

Usuario: «Sigue con spec10». Main `5c3e49b`, piloto PR59 integrado tras «Apruebo merge»;
los apartados inferiores conservan historia. Rama `codex/spec10-plan-anual`.
[Brainstorming10](10-plan-anual-brainstorming.md): E2.4, Plan anual por Partida/ejercicio.
Q1 importes/edición, Q2 dominio de Periodo previsto y Q3 regla de esenciales pendientes.
No se reabren las decisiones R3 ya documentadas. Sin specification, wireframes aprobados,
desarrollo ni migración. Un ejecutor, sin delegación para esta ronda.
Piloto, corte parcial 24/10 16:39:27 Madrid, turno `01a16e55-03e5-7952-b0a3-9620957cd2ea`:
coordinador gpt-6.1-sol,6 respuestas,entrada1391340,caché incluida1378176,salida3925.
Fuente collect existente; no incluye respuestas posteriores. Cero delegaciones,
instalaciones o CI; un validate-template PASS y whitespace PASS, cero repeticiones.
QA independiente aún no aplica al borrador; defectos QA N/D, no cero acreditado.
Un intervalo operativo al crear rama:204,386 s envolventes, no CPU ni aprobación pura.
Sin afirmar mejora frente a otra tarea. Fuentes consultadas y Q1–Q3 quedan recuperables.
Próximo paso: recibir Q1–Q3 y continuar el diseño documental; no hacer merge ni dev.

---

## Estado vigente — piloto spec10 — 2026-10-24

Solicitud real del usuario: aplicar en MyFinanzas el piloto de eficiencia y medirlo
antes de cambiar la plantilla; no autoriza desarrollar spec10 sin sus aprobaciones.
Main comprobado: `9fd2317` (PR58 harness v2.7.0 integrada tras «Haz el merge»).
E2.3 integrada por PR57/`7422d23`; sus bloqueos inferiores son historia, no estado vigente.
B3 continúa abierto y no se reanuda por este piloto; Dev32 y Excel/despliegue fuera.

Piloto local: [reglas](methodology/myfinanzas-coordination.md#piloto-de-eficiencia--spec10--e24).
Spec10 corresponde a E2.4, Plan anual por Partida y ejercicio. Preparación documental
solicitada; spec/wireframes aún no aprobados y desarrollo NO autorizado.
Esta rama solo registra el piloto; no crea todavía specification ni código de E2.4.

| Mecanismo | Reutilización / ajuste mínimo |
| --- | --- |
| Entorno | Reusar checkout limpio; preflight por fase, sin reinstalación rutinaria |
| Delegación | Paquete existente; un ejecutor y QA independiente, contexto breve |
| Verificación | scripts/verify existente; focales por delta y evidencia por candidato |
| CI | Grafo/política intactos; consultas espaciadas y trabajo independiente autorizado |
| Medición | JSONL/reportes existentes; anotación por hito aquí y en progress/testplan10 cuando existan |

Referencia de auditoría 24/10, 08:00–12:30 Madrid: 487 respuestas propias únicas,
105325937 tokens de entrada (103818240 caché incluida), 170099 salida; coordinador
78,45% de entrada. 50 llamadas del coordinador con escalación acumularon 72,1 min
envolventes, no atribuibles íntegramente a aprobación humana. CI:24 runs,9 cancelados,
37 min28 s agregados de jobs activos; instalación Chromium78 s. No hay informes de
hooks de MyFinanzas disponibles. Estos datos no son objetivos ni una medición del piloto.

Registro inicial del piloto: preflight PASS para esta fase documental, mismo checkout,
Python3.12.14 y Bun1.4.3 disponibles; Python del sistema3.9 no se utiliza para verify.
Sin instalación, cambio de hooks/trust ni herramientas nuevas. Rama de preparación
`codex/pilot-spec10-efficiency`; baseline canónico PASS una vez y QA documental
independiente PILOT10-QA PASS, cero hallazgos bloqueantes (sin repetir tests).
Mediciones se cortarán por sesión/turno/candidato, sin mezclar el consumo de la auditoría
con el piloto. No se declara todavía ahorro ni resultado funcional de spec10.
Corte fijo de preparación, 24/10 16:18:10 Madrid (14:18:10 UTC), turno raíz
`01a16e41-5872-73c2-b1ca-9ff7ef6be56f`, modelo gpt-6.1-sol:

| Agente | Respuestas | Entrada | Caché incluida | Salida |
| --- | --- | --- | --- | --- |
| Coordinador | 10 | 2090422 | 2077056 | 4829 |
| QA documental, contexto nuevo acotado | 4 | 143267 | 103424 | 396 |

Fuente: collect de scripts/report-agent-usage, sin generar archivos ni activar hooks.
Corte parcial: no incluye respuestas posteriores, publicación ni el futuro trabajo
funcional de spec10. Un baseline ejecutado; cero repeticiones y cero fallos de tests
hasta este corte. QA: cero defectos detectados; no equivale a QA de E2.4.
Un intervalo operativo de escalación al crear rama: 16:13:10–16:15:49 Madrid,
159,09 s envolventes (no tiempo de CPU ni aprobación humana pura). No hubo colisión
de archivos, reinstalación ni bloqueo de desarrollo resuelto por inferencia.

Próximo hito: revisar/publicar este registro y continuar spec10 con las decisiones
funcionales pendientes según Skill spec; merge de cada PR requiere aprobación propia.

---

## Dev09 autorizado y en curso — 2026-10-24

Fuente: mensaje real del usuario «Autorizo dev 09». Spec09 revisión4 y wireframes
aprobados e integrados mediante PR #54, main `568aeed`. E2.1/dev07 ya integrada
PR #49; E2.2/dev08 integrada PR #44. Sus estados pendientes inferiores son históricos.
CI docs de #54 verificada: baseline/required SUCCESS, full omitido correctamente.
Correcciones #55 (clasificación documental) y #56 (foco de revisión) integradas.

Dev09: rama `codex/dev09-plan-ciclo`, un ejecutor, QA independiente al candidato.
Ownership producto/tests/progress09/testplan09 del ejecutor; tablero del coordinador.
Entregable: E2.3 según [spec09](09-plan-ciclo-specification.md), 36 AC actuales y
V1–V10; evidencia en [progress09](09-plan-ciclo-progress.md) y
[testplan09](09-plan-ciclo-testplan.md). Candidato publicado en PR #57, HEAD `88941e1`.
CI40076614284: API137PASS/1FAIL (B3 heredado IOERR_SHORT_READ522);13 pruebas nuevas
PASS y E2E local1PASS, pero E2E global pendiente. Aceptación global bloqueada,
sin investigación B3 ni reintentos automáticos. Checkpoint documental local separado.
Sin merge autorizado de PR funcional, datos reales, Excel, despliegue, reanudación
Dev32 ni investigación B3. Cierres/fotos y fuentes E3/E4 continúan futuros.

## Dev07 verificado, PR #49 pendiente de revisión — 2026-10-23

Fuente de autorización: mensaje real del usuario «Autorizo reanudar Dev07 / E2.1 —
Operación de Ciclos, utilizando `$orchestrate` y la metodología vigente». Sustituye
STOP únicamente para este alcance; no autoriza merge ni otras líneas.
Este estado prevalece sobre los registros históricos inferiores.

## Verificación actual — 2026-10-23

Candidato funcional `a2722f4`, PR #49 pendiente de revisión/merge; main `8fae7a44`
incorporado preservando el checkpoint `d1868dc`. SQLite31-E1 intacto; E2.2 v8 y E2.1 v9.
CI Linux [39974920637](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39974920637)
SUCCESS: API 125/0 (2228 aserciones), E2E 2 PASS, tipos/build/controles PASS.
AC23 verificado por cinco pasadas locales + cinco Linux, O4/O5/O7 v7/v8 y suite global;
QA independiente9/167 y probe de antiguo schema8, sin bloqueos; capturas390/1440 inspeccionadas.
Evidencia completa y límites en [testplan07](07-ciclos-operacion-testplan.md).
Los bloques inferiores conservan historia previa; AC27–29/E2.1-AC2 siguen futuros.
Sin Dev32/infraAC22/B4/E2.3, datos reales, deploy o merge. Próximo paso: revisión PR #49
y aprobación expresa por su número. El cierre posterior solo cambia documentación.


---

## Estado vigente — E2.2 integrada — 2026-10-23

Coordinador (Claude Code, `/orchestrate`). Prevalece sobre los apartados inferiores; el
tablero registra, no concede, autorizaciones. Main verificado `255bf61` con CI SUCCESS; después `a7fb9d8` (PR #29).

| Línea | Estado verificado | Próxima acción / gate |
| --- | --- | --- |
| E2.2 / dev08 | INTEGRADA: PR #44 squash `255bf61` tras «Apruebo PR #44» del usuario, HEAD `6eeb727` con ambas CI SUCCESS (job pull_request relanzado una vez a petición del usuario por fallo intermitente de SQLite B4) | Cerrada; limitaciones en [testplan08](08-presupuestos-testplan.md) |
| E2.3 | Siguiente entrega del roadmap; consume Presupuestos | Requiere especificación y autorización propias |
| E2.1 / dev07 / AC23 | BLOQUEADO; rama `feat/07-ciclos-operacion` fuera de main, sin PR. Investigación 2026-10-23: la sonda `immutable=1` de `persistentIdentity` produce `SQLITE_CORRUPT/11` en migraciones concurrentes (21/150 rondas; control con bloqueos 0/150); atribución al fallo de dev07 pendiente ([diagnóstico](investigations/ac23-immutable-probe.md)) | Corrección de la sonda requiere autorización expresa; después, reanudar dev07 renumerando su esquema a v9 |
| Spec31 / enmienda 31-E1 | APROBADA 2026-10-23 («Apruebo enmienda 31-E1»); desarrollo autorizado el 2026-10-23 e implementado en `fix/ac23-persistent-identity` (código `07e0369`, CI 114/0, QA sin bloqueos), pendiente de merge: verificar identidad con conexión convencional y transacción de lectura; garantía lógica en lugar de bytes de WAL/SHM ([propuesta](31-sqlite-produccion-enmienda-01.md)) | Merge de su PR con «Apruebo PR #N»; después, decidir si se reanuda dev07 (renumerando su esquema a v9) |
| SQLite B4 | Fallo intermitente observado una vez en CI de `6eeb727`; pasó al relanzar | Incidencia de apertura SQLite fuera de alcance; no investigar sin autorización |
| Spec32 / PR #29 | INTEGRADA: squash `a7fb9d8` tras «Apruebo PR #29» del usuario, HEAD `a9e0fdb` con CI SUCCESS y merge con main verificado localmente | Solo documentación; no reactiva Dev32 |
| Dev32 / PR #30 / AC22 | PAUSED; draft con conflictos, 12 commits por detrás de main | Reanudar solo con autorización expresa; revisar actualización/rollback con esquema v8 |
| PRs #21 y #22 | CERRADAS 2026-10-23 como sustituidas por spec31/dev31 (#23, #25, #28, #31), con permiso del usuario; ramas conservadas | — |
| PR #35 | Cerrada como sustituida por #43 | — |

Worktrees temporales de dev08/QA08 eliminados tras el merge; rama `feat/08-presupuestos` conservada.

---

## Estado vigente — dev08 candidato verificado — 2026-10-23

Coordinador (Claude Code). Prevalece sobre «Parada y checkpoint WIP dev08» inferior; el
tablero registra, no concede, autorizaciones. Main verificado `ca5de20` (PR #43, harness
v2.5.0). PR #35 cerrada como sustituida por #43 con permiso del usuario.

| Línea | Estado verificado | Próxima acción / gate |
| --- | --- | --- |
| E2.2 / dev08 | Autorizado por «Álex — Autorización de desarrollo E2.2 · `$dev 08`» (texto en el apartado 2026-10-22 inferior). Candidato en `feat/08-presupuestos`, CI Linux por SHA en [testplan08](08-presupuestos-testplan.md) | PR funcional; merge solo con «Apruebo PR #N» |
| Decisión dev08 | Usuario 2026-10-23: «Sí: cambiar la fuente con un destino ya inactivo cuenta como nueva relación y debe exigir un Saldo activo; solo renombrar conserva el destino inactivo.» Implementada en `2880f98` | Sin otras decisiones abiertas |
| QA08 | Independiente: QA08-1 `f82064b` NO_BLOCKERS (24 AC PASS), QA08-2 delta `84078b2` NO_BLOCKERS, QA08-3 delta `2880f98` NO_BLOCKERS | Limitaciones menores listadas en testplan08 |
| E2.1 / AC23 | BLOQUEADO; dev07 fuera de main sin PR | Integrar dev07 exigirá reconciliar su esquema8 con el contrato v8 de E2.2 |
| Dev32 / PR30 y PRs #21, #22, #29 | PAUSED / abiertas sin decisión | No reanudar |
| E2.3, F-01/F-02 | Fuera de alcance | Sin Base/Esencial/Del mes ni ejecución |

---

## Reconciliación — 2026-10-23 — main 30c7ea0

Coordinador: reconciliación documental solicitada por el usuario; no concede autorizaciones nuevas.
Main remoto verificado en `30c7ea0` (PR #41, adopción orquestación v2.4.2, solo metodología),
sobre `20d8f9a` (PR #39, spec08). Este apartado complementa el cierre spec08 inferior
(PR #40, integrada por squash en main `11e2fae` el 2026-10-23 tras «Apruebo PR #40» del usuario, HEAD `b5c88d7` con CI SUCCESS) y prevalece
sobre estados históricos más antiguos.

| Línea | Estado verificado en Git | Próxima acción / gate |
| --- | --- | --- |
| E1.1–E1.6 | Integradas; E1.6 por PR34 `cb9ba3b` | Sin cambios |
| E2.1 / spec07 | Aprobada e integrada PR37 `c04dc07` | Sin cambios de decisiones ni criterios |
| E2.1 / dev07 | Rama `feat/07-ciclos-operacion` HEAD `d1868dc`, fuera de main; sin PR (ningún `refs/pull/*/head` apunta a ella). Handoff STOP / NO AUTO-RESUME en progress07 de esa rama | Reanudar solo con nueva instrucción expresa del usuario |
| AC23 | BLOQUEADO; API 105 PASS / 1 FAIL errno11 según checkpoint dev07 | Sin investigación nueva sin hipótesis discriminante y autorización |
| E2.2 / spec08 | Aprobada e integrada PR39 `20d8f9a`; cabecera de la especificación actualizada a APPROVED por instrucción del usuario del 2026-10-23, que sustituye la decisión de PR #40 de no tocarla; cuerpo intacto | Spec aprobada no autoriza dev08 |
| E2.2 / dev08 | NO AUTORIZADO; plan propuesto en el cierre spec08 inferior | Esperar autorización expresa de desarrollo |
| Dev32 / PR30 / AC22 | PAUSED; PR30 HEAD `a090112` | No reanudar |

Paquetes activos: ninguno. Worktrees adicionales en este checkout: ninguno. Los SHAs
históricos de cabecera del tablero (`cb9ba3b`) quedan sustituidos por este apartado.

PRs verificadas con `gh` el 2026-10-23 (este registro no aprueba merges):

| PR | Rama | Estado | Nota |
| --- | --- | --- | --- |
| #40 | `docs/08-integration-close` | MERGED squash `11e2fae` (HEAD `b5c88d7`, CI SUCCESS) | Cierre spec08 y plan dev08; aprobada expresamente por el usuario |
| #35 | `docs/explicit-approvals-v2-3-2` | Abierta, CONFLICTING | Metodología v2.3.2; posiblemente superada por v2.4.x, sin decidir |
| #30 | `feat/32-ejecucion-rootless` | Draft, CONFLICTING | Dev32 PAUSED |
| #29 | `spec/32-ejecucion-rootless` | Abierta, MERGEABLE | Spec32 aprobada, no integrada |
| #22 | `infra/production-sqlite-bootstrap` | Draft, CONFLICTING | Infra pausada |
| #21 | `infra/production-bootstrap-spec` | Draft, MERGEABLE | Infra pausada |

Cerrar o actualizar PRs antiguas requiere decisión expresa del usuario por PR.

---

## Estado vigente — cierre spec08 y autorización de integración — 2026-10-22

Fuente: aprobación documental final de Álex y autorización expresa de squash PR39. Este apartado prevalece sobre estados históricos inferiores; el tablero registra autorizaciones, no las concede.

| Línea | Estado verificado | Próxima acción / gate |
| --- | --- | --- |
| E2.2 / spec08 | APROBADA e integrada por squash PR39, main20d8f9a6eef9888e03a5a61ecb11a13b21fbc2ad | Spec y wireframes cerrados; preservar decisiones,24 AC actuales y F-01/F-02 futuros |
| E2.2 / dev08 | NO AUTORIZADO; implementación y pruebas de E2.2 no ejecutadas | Presentar plan y esperar autorización independiente; spec aprobada no autoriza dev |
| E2.1 / spec07 | Especificación aprobada e integrada PR37/c04dc07 | Sin cambio de decisiones ni criterios |
| E2.1 / dev07 / AC23 | Implementación conservada fuera de main; AC23 BLOQUEADO, sin aceptación global | No presentar API105 PASS/1 FAIL como resuelta por verdes posteriores |
| AC23-SQLITE | Incidencia técnica separada; investigación actual CERRADA INCONCLUSA | Sin nuevos probes/instrumentación/cambios sin hipótesis nueva discriminante y autorización aplicable |
| Dev32 / PR30 / AC22 y otras tareas pausadas | PAUSED | No reanudar |
| E2.3 | Fuera de esta autorización | No implementar planificación/ejecutado/pendientes/estados mensuales en E2.2 |

PR39 se integró únicamente después de verificar HEAD0f3d4e5575cd855558cfd8a8cfb11e980ff55398, mergeable sin conflictos y CI push39851581005/PR39851590534 completed SUCCESS sobre ese SHA. Diff final: solo brainstorming08 y specification08. Su corrección técnica fue una línea portable; contratos financieros y wireframes intactos. CI posterior main: [CI main39853674496](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39853674496) completed SUCCESS sobre main20d8f9a6eef9888e03a5a61ecb11a13b21fbc2ad, confirmado después de finalizar el workflow; sin reintentos manuales.

Documentos canónicos: [brainstorming08](08-presupuestos-brainstorming.md) y [specification08](08-presupuestos-specification.md). Sus marcas DRAFT/PENDING describen la revisión previa; la aprobación completa e integración posterior quedan registradas aquí con la instrucción expresa del usuario, sin modificar los documentos aprobados ni repetir preguntas financieras. La CI acredita regresión del núcleo integrado, no implementación E2.2 ni resolución de AC23.

### Plan dev08 propuesto — pendiente, NO iniciar

1. Reconciliar base main integrada y evolución versionada del esquema; trabajar en rama aislada. No importar dev07/schema8 ni reparar apertura SQLite. Prever que cualquier integración futura de Ciclos deberá reconciliar versiones/contratos de migración y repetir su continuidad; no asumir intercambiables dos cambios de esquema pendientes.
2. Maestro/validaciones: identidad PRE estable, tres fuentes y matriz destino, unicidad global de nombres (incluidos inactivos) con criterio SUB autorizado y unicidad atómica del destino entre Aportaciones; revisión/idempotencia/auditoría y activar/desactivar preservando historia.
3. Vínculo Partida0..1 Presupuesto, Deuda independiente, protección de Partidas activas; preview/motivo/confirmación de cambios utilizados solo con impacto histórico completo verificable. Sin consumidor disponible, bloqueo explícito; no inventar cálculos E2.3.
4. API/UI conforme wireframes: listado/ficha/formulario y selector desde Partida, MFA/Origin/CSRF y estados de error/borrador/conflicto. Sin Base/Esencial/Del mes, ejecución ni importes ficticios.
5. Verificación autorizada futura: matriz24 AC, continuidad/rollback/concurrencia/backup-restore privado, regresión API y E2E390/1440; typecheck/build y revisión independiente del candidato. F-01/F-02 siguen futuros. Un FAIL global conserva el gate de entrega, sin ampliar investigación SQLite por inferencia.
6. Solo con candidato verificable: revisión de historial/contenido, commits/PR de desarrollo según autorización aplicable. Merge requerirá permiso expreso de esa PR. Sin despliegue/Excel real/datos personales ni reanudación Dev32.

Mantener un ejecutor por defecto; no crear subagentes por este plan. La revisión independiente futura no se considera ejecutada ni autorizada como actividad presente. Detenerse después de presentar este plan al usuario.

---

## Historial anterior — conservar trazabilidad

# MyFinanzas — tablero de coordinación

## Parada y checkpoint WIP dev08 — 2026-10-23

El usuario detiene desarrollo y autoriza únicamente commit/push de todo el estado
de dev08, sin PR ni merge. Este estado prevalece sobre IN PROGRESS inferior:
**dev08 WIP SIN VALIDAR**, ejecución detenida tras límite de uso de Developer.
API posterior105 PASS/0 FAIL/1713 observada en log; primera98/7 conservada;
E2E no superado y QA independiente NO ejecutada. Ver [checkpoint08](08-presupuestos-progress.md)
y [evidencia parcial08](08-presupuestos-testplan.md). No reanudar automáticamente.
AC23/E2.1 BLOQUEADO, AC23-SQLITE inconcluso separado y Dev32 PAUSED; PR40 independiente.

## Estado vigente — ejecución dev08 autorizada — 2026-10-22

Fuente: mensaje expreso «Álex — Autorización de desarrollo E2.2 · $dev 08».
Prevalece sobre permisos históricos inferiores. El tablero registra autorizaciones,
no las concede. Spec08/wireframes aprobados e integrados mediante squash PR39 en
main `20d8f9a6eef9888e03a5a61ecb11a13b21fbc2ad`; HEAD autorizado `0f3d4e5`,
CI push39851581005 y PR39851590534 SUCCESS. CI posterior main39853674496 SUCCESS.

| Línea | Estado real / autorización | Siguiente gate |
| --- | --- | --- |
| E2.2 spec08 | APROBADA e integrada PR39;24 AC actuales y F-01/F-02 futuros | Conservar decisiones/wireframes; no reabrir preguntas |
| E2.2 dev08 | IN PROGRESS; seis incrementos, pruebas, QA independiente y preparación PR autorizados | Developer entrega candidato SHA; QA evalúa, coordinador publica solo si verificable |
| QA08 | Matriz24 preparada, NO ejecución ni PASS todavía | Esperar candidato exacto, revisión independiente y checks reales |
| E2.1/AC23 | BLOQUEADO; sin aceptación global | Conservar fallo histórico; no darlo por resuelto por verdes de dev08 |
| AC23-SQLITE | Investigación actual cerrada INCONCLUSA, incidencia técnica separada | Sin probes/cambios nuevos sin hipótesis discriminante y autorización aplicable |
| Dev32/PR30/AC22 y otras tareas pausadas | PAUSED | No reanudar |
| PR40 | Actualización documental independiente, OPEN sin merge autorizado | No integrar por inferencia de permisos dev08 |
| E2.3 y F-01/F-02 | PENDING/FUERA DE ALCANCE dev08 | Sin planificación/Base/Esencial/Del mes/ejecutado/pendientes/estados mensuales |

Base exacta main verificada con árboles/commits Git, rama aislada feat/08-presupuestos.
Sin importar dev07 ni modificar checkpoints ajenos. Su migración aún fuera de main
no se presume compatible: documentar reconciliación futura y regresiones, no reparar
SQLite incidentalmente. Sin Excel real/datos personales/despliegue/migración operativa.
No merge automático de futura PR funcional. Estados históricos inferiores conservados.

---

## Historial anterior

Coordinador: único escritor; [gates locales](methodology/myfinanzas-coordination.md).
Reconciliación: 2026-10-22 Europe/Madrid. Main remoto verificado en
`c04dc07a2205f7718747bb390e15b42c09502bec` (PR #37 integrada).
PR #34 integrada en `cb9ba3b93dc12a4107f063930bca0b48b67babbe`.
PR #33 integrada en `7c5c7d1bfb62bdc77af1fad080312e6dce1577dd`.
PR #32 integrada en `da543f3af6bde89259aeb0d9b2c1faad67311c05`.
Este tablero registra estado; no concede aprobaciones.

## Autorización vigente de esta ejecución

El usuario aprobó el plan y autorizó expresamente dev06, pruebas, relevo QA independiente
y preparación de PR; especificación E2.1 sin implementación ni aprobación automática;
subagentes y worktrees seguros, máximo dos trabajadores simultáneos más coordinador.
Dev32/PR30/AC22 permanecen pausados. Sin merges, despliegues, migraciones operativas,
cambios de seguridad ni decisiones financieras nuevas por inferencia.
La instrucción posterior de continuar preserva estos permisos e incorpora PR33,
sin reiniciar agentes ni trabajo ya realizado.

| Item | Prioridad | Spec / autorización | Dev | QA | Dependencias duras | Dueño / aislamiento | Bloqueo | Siguiente acción autorizada | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ADOPT-ORCH | Cerrada | PR32 integrada; PR33 actualiza autonomía operativa | Metodología vigente | Ensayo nativo previo conservado; no repetido | Satisfechas | Coordinador | Ninguno | Aplicar contrato vigente | PR32 da543f3; PR33 7c5c7d1b |
| E1.6 | Cerrada actual | Spec06 y merge PR34 aprobados por usuario | Integrada main cb9ba3b | QA independiente y CI de rama SUCCESS | Dependencias satisfechas | Sin trabajador activo; rama feat/06-deuda preservada | Ninguno para alcance actual | Conservar evidencia; 3 contratos futuros pendientes | [PR34](https://github.com/josemartin2000/myfinanzas-app/pull/34), [testplan06](06-deuda-testplan.md) |
| E2.1 / spec07 | Cerrada documental | Aprobada e integrada PR37; auditoría de Álex favorable | Dev07 autorizado expresamente en ejecución actual | Spec/wireframes aprobados; aceptación funcional pendiente | E1.3/E1.4 integradas; AC2 futuro depende Comida | Coordinador | Ninguno documental | Reutilizar sin reabrir decisiones | [PR37](https://github.com/josemartin2000/myfinanzas-app/pull/37), main c04dc07 |
| E2.2 | Futura | Roadmap aprobado; sin spec/dev nuevos autorizados | not-ready | no ejecutado | E1.1/E1.2/E1.6; P3/R3 | Sin trabajador | E1.6 satisfecha; permiso específico pendiente | No iniciar | [roadmap](roadmap.md) |
| DEV32 / AC22 | Pausa independiente | Spec PR29 aprobada, aún no integrada; no nueva continuación | 23/24; AC22 pendiente | Revisión independiente NO iniciada | Orden PR29 → PR30 | PR30 Draft; feat/32-ejecucion-rootless; fuera de los worktrees actuales | Pausa expresa; suficiencia AC22 pendiente | Conservar checkpoint sin investigar ni modificar | PR30 a09011224e248edcc83080363660a237d409a7d8 |

## Paquetes activos y ownership

| Paquete | Estado | Escritura exclusiva | Límites / retorno |
| --- | --- | --- | --- |
| DEV06 | Cerrado e integrado PR34 | Código/tests E1.6 y progress06/testplan06 en worktree e16 | 30 AC actuales; 3 futuros separados; candidato/SHA y evidencias reales; sin tablero/infra/spec07 |
| SPEC07 | Cerrado e integrado PR37 | Documentos specs/07-* en worktree e21 | Nueva autorización dev07 registrada abajo; sin código/tablero/infra |
| QA06 | Completado sobre f2bfc1b; cuatro hallazgos iniciales corregidos | Lectura y probes propios en worktree qa06; sin cambios a candidato | Independiente de autor; SHA fijo, AC/regresiones/seguridad/persistencia; no merge |

Los agentes reciben templates/agent-work-packet.md como contrato en su contexto.
Sin delegación recursiva; máximo dos trabajadores simultáneos. QA reutilizará capacidad
al terminar SPEC07 o DEV06. Solo coordinador escribe este tablero en
`chore/orchestrator-execution`; no comparte archivos de escritura con trabajadores.
Worktrees separados; suites con puerto3001 se ejecutarán de forma serial.

## Checkpoint de infraestructura preservado

Recuperados progress32/testplan32 e investigación existente desde SHA a090112, solo lectura.
Tres CI de a090112 confirmadas completed/success: rootless39739941226,
Validate PR39739941392 y push39739935397. Esto no cierra AC22.
Candidato86b1570/B5 demuestra carrera concreta de identidad y corrección mediante
snapshot, no causalidad del fallo histórico E1.4. R6, fsync post-rename y fallo API
histórico permanecen abiertos. Sin nuevas investigaciones, cambios, reruns o agentes infra.
No hay dependencia dura documentada de Dev32 para iniciar E1.6.

## Handoff y gates

Coordinador encadena dev → QA → correcciones técnicas autorizadas → verificaciones → PR.
Merge requiere permiso expreso de esa PR. E2.1 se detiene en decisiones nuevas y
aprobación de especificación; aprobar spec no autoriza desarrollo.
No trabajo entre sesiones ni control de chats externos. Reconciliar SHA/diff/evidencias
antes de publicar; preservar cambios y no declarar PASS o completado sin verificación.

## Historial metodológico

Ensayo PR32 ADOPT-RO-1/2 completado, lectura sin escrituras; no se repite para demostrar
herramientas. PR24 integrada b60def1. Estado anterior de tablero (PR32 Draft y dev06
sin autorización) queda sustituido por esta reconciliación y permisos expresos actuales.

### Actualización de paquetes
SPEC07 devuelve brainstorming07 sin commit ni aprobación, en worktree e21.
Q1 y la dependencia real Comida (E3.5 para aviso AC2) se han presentado al usuario.
No se ha rebajado AC2 ni cambiado roadmap. QA06-DESIGN completado en lectura por
/root/spec07; matriz AC01–30 y contratos31–33 revisados, sin suites ni PASS inventados.
Plaza disponible para QA ejecutable tras candidato; DEV06 continúa en su worktree.

### QA06 — primer candidato
Candidato67f2dbd en checkout QA aislado. QA reprodujo: extraordinaria UI con desglose
null rechazada; exceso aplicado indebidamente a precontrol; apertura productiva v6
sin migrar a tablas nuevas. Hallazgos enviados a DEV06 para corrección y regresiones
dentro de la spec aprobada. No aceptación global ni PR lista. Developer continúa
pruebas/UI mientras QA revisa el SHA fijo; no suites compartiendo puerto3001.

### DEV06 — verificación en curso
Developer informa correcciones de los cuatro hallazgos, API96 PASS/1537 aserciones,
typecheck/build PASS y prueba multiproceso v6→v7/IDs/reintentos/exceso. Evidencia
definitiva se consolidará por SHA en testplan06; no se trata como aceptación final.
Playwright E1.6/restoreMFA y capturas390/1440 en ejecución exclusiva de Developer;
QA no usa simultáneamente los puertos de esos servidores.

### Respuestas expresas E2.1 — 2026-10-22
Usuario confirma permitir rectificación con revisión de impacto (Q1) y especificar
operación disponible conservando AC2 pendiente hasta integrar Comida. No se declara
AC2 cumplido ni aprobada la especificación/wireframes. Tras cerrar QA06, el trabajador
Functional completará propuesta07 sin implementar E2.1.

### Candidato E1.6 corregido
Código3239c2d: Developer confirma API97 PASS/1547 aserciones, Playwright2 PASS47s,
typecheck/build y controles18+22 PASS. QA independiente confirma probes originales
corregidos y suite enfocada Deudas10 PASS/166 aserciones. Se añade aún resumen
visual capital/intereses en auditoría; se verificará incremental antes de cerrar.

### QA06 — cierre de código
Código final f2bfc1b0b3e0b86ae4232d3ee30d896f8b47b6f0, sin bloqueantes detectados
por QA independiente. Probes originales corregidos; ejecución QA propia:10 Deudas/166
aserciones y9guardas productivas/67aserciones PASS sobre3239c2d. Backend idéntico en
f2bfc1b; cambio incremental resumen auditoría capital/intereses revisado y E2E afectado
Developer1 PASS28.1s. Suite completa DeveloperAPI97/1547 yE2E2/47s sobre3239c2d.
No se atribuyen esas suites a QA. Historial de cuatro commits de desarrollo revisado
sin secretos/DB/datos reales detectados; solo fixtures y capturas ficticias. CI remota
y revisión del commit documental final pendientes antes de entregar PR.
SPEC07-FINAL en curso por mismo trabajador: propuestas pendientes de aprobación final,
sin implementación ni tercer trabajador. Dev32 conserva pausa expresa.

### Entrega del coordinador
Conciliado cierre QA f2bfc1b y documentación final fbcf423; los cuatro commits de
tablero se incorporan por el coordinador a feat/06-deuda, único escritor de tablero.
Rama preparada para PR hacia main; [comparación](https://github.com/josemartin2000/myfinanzas-app/compare/main...feat/06-deuda).
Resultados remotos vigentes se consultan por SHA en la PR, sin inferirlos de pruebas
locales. Merge sigue pendiente de autorización expresa. SPEC07-FINAL completa
propuesta documental con las respuestas recibidas; spec/wireframes no aprobados.

### PR34, corrección de fixture CI y propuesta07
[PR34](https://github.com/josemartin2000/myfinanzas-app/pull/34) abierta, sin merge.
SHA5c1e4f0: CI push39752272341 yPR39752340189 FAILURE, API96/97; únicamenteD4
rechazó un sidecar de fixture sin0600. E2E remoto no ejecutado por ese fallo.
Reproducción determinista umask022 falló; fix28cb52c limita cambios a creación privada
fixturev6 desdeprimeropen y negativoWAL0644. Ningún cambio producto/guardas/infra32.
Developer: API íntegra bajo02297 PASS/1557aserciones. QA independiente: D4 bajo022
1 PASS/84aserciones, rechazo inseguro y snapshot/identidad/clave intactos; revisión
de diff sin bloqueantes. Se publica fix y se verifica nueva CI por SHA en PR34,
sin rerun manual ni conversión retrospectiva de los fallos en PASS.

SPEC07-FINAL completado: brainstorming yspec07 en worktreee21, propuestas sin commit
ni implementación,26ACoperación y3contratos integración. Q1/Q2 confirmadas; spec y
wireframes390/1440 requieren aprobación final. E2.1-AC2 sigue pendiente hastaComida.
Validación documental PASS. Los documentos se preservan sin declarar spec aprobada.

El cierre de esta ejecución espera únicamente CI dePR34 y revisión del usuario:
mergePR34 y aprobaciónspec07 son gates distintos; ninguno autoriza despliegue ni
dev07 por inferencia. Dev32/PR30/AC22 continúa PAUSED; checkpoints sin modificación.

## Estado vigente tras aprobación del usuario — 2026-10-22
Este apartado sustituye los gates pendientes de los registros históricos anteriores.
Usuario «dale»: integración de PR34 y cierre documental spec07/wireframes aprobados.
PR34 MERGED, squash cb9ba3b93dc12a4107f063930bca0b48b67babbe, HEAD81ca2cdd
y CI push39753174309/PR39753182014 SUCCESS comprobados. Main y worktree e21
sincronizados preservando los borradores. Ningún cambio de producto al integrar.

| Item | Estado vigente | Siguiente acción / gate |
| --- | --- | --- |
| E1.6 | Integrada PR34; aceptación actual y QA cerradas; 3 contratos futuros separados | Consultar CI de main por SHA; no despliegue |
| E2.1 / spec07 | Spec y wireframes aprobados; 26 criterios operativos y 3 integraciones futuras | Preparar PR documental y verificar CI; merge de nueva PR requiere permiso |
| E2.1 / dev07 | NO autorizado | Permiso expreso de desarrollo por entrega, además de spec integrada y dependencias |
| Dev32 / PR30 / AC22 | PAUSED, checkpoint intacto | No investigar, corregir ni integrar |

No subagentes nuevos: cierre documental por coordinador, cuota eficiente. Los
worktrees y temporales previos se conservan; ningún recurso con trabajo pendiente
se elimina. Aprobar spec07 no autoriza automáticamente desarrollo ni su nuevo merge.

## Cierre documental E2.1 autorizado por Álex — 2026-10-22
Auditoría funcional y documental de [PR37](https://github.com/josemartin2000/myfinanzas-app/pull/37)
favorable. Spec07 y wireframes aprobados; permiso expreso de squash condicionado
a ambas CI SUCCESS del HEAD final y ausencia de conflictos. Se corrige únicamente
la cabecera del brainstorming y se conserva su trazabilidad; ningún cambio de
alcance, wireframes, criterios, código, SQL o infraestructura. Estado efectivo de
integración y SHA de main: registro Git de PR37 y sus Checks, verificados al cerrar.

| Línea | Estado documental / autorización | Próxima acción |
| --- | --- | --- |
| E2.1 / spec07 | Aprobada por Álex; cierre de PR37 autorizado con gates CI/HEAD | Integrar/verificar y presentar plan dev07 |
| E2.1 / dev07 | NO autorizado; 26 AC operativos y 3 contratos futuros | Revisar plan antes de dar permiso expreso |
| E2.1-AC2 | Pendiente hasta motor real Comida E3.5 | No simular conciliación ni declarar PASS |
| Dev32 / PR30 / AC22 | PAUSED; checkpoint preservado | Sin investigaciones ni cambios |

Preparación técnica/pruebas permitida en lectura; sin nuevos subagentes ni
implementación durante este cierre. tblCiclos sigue único maestro, saldo Comida
manual sin propagación, IDs y Movimientos originales preservados.

## Ejecución DEV07 autorizada — 2026-10-22
Fuente: mensaje expreso «Álex — Autorización $dev 07 · E2.1 Operación de Ciclos».
Autoriza los cinco incrementos, pasos técnicos ordinarios, Developer y QA independiente
con worktrees aislados, máximo dos trabajadores en esta ejecución. No es límite
permanente del orquestador. Spec07 integrada PR37, main c04dc07 verificado limpio y
sincronizado. CI del HEAD final1edccec push39790248100/PR39790254659 SUCCESS y
CI de main39790748788 SUCCESS. Los gates históricos de no iniciar dev07 quedan
sustituidos únicamente por esta autorización expresa, sin nuevos permisos por analogía.

| Paquete | Estado | Ownership / aislamiento | Gate y retorno |
| --- | --- | --- | --- |
| DEV07 | implementado; verificación global BLOQUEADA por AC23/API105/1 | /root/dev07; feat/07-ciclos-operacion; worktree dev07; código/tests y progress07/testplan07/contexto | 26 AC reales; 3 futuros separados; commits y evidencia por SHA; sin tablero/infra |
| QA07 | dictamen funcional favorable sobre53cc238; gate global abierto | /root/qa07; qa/07-ciclos-operacion; worktree qa07 | Revisión independiente y pruebas reales; sin editar producto ni tablero |
| COORD07 | activo, único escritor de este tablero | chore/07-coordination; worktree coord07 | Encadenar Developer → QA → correcciones → checks → PR; nunca merge sin permiso |

La ejecución conserva maestro único Ciclos, revisión antes/después/motivo/confirmación,
hechos originales, saldo Comida manual sin propagación, concurrencia/idempotencia/
auditoría y continuidad v7. E2.1-AC2 sigue pendiente hasta ComidaE3.5; no se finge
conciliación, cierre ni motor futuro. Nuevas decisiones financieras no cubiertas se
detienen para aprobación. Sin datos reales, Excel, despliegue o migración operativa.
Dev32/PR30/AC22 PAUSED. No agentes infra ni investigaciones salvo bloqueo demostrado.
QA se activa al existir candidato, evitando trabajadores o suites duplicadas.

### Primer candidato DEV07 y relevo QA
SHA3834ca9 contiene backend de operaciones revisadas, extensión v8 del maestro
existente y continuidad v7. Developer informa typecheck PASS y3 pruebas/36
aserciones PASS; no es aceptación completa ni cobertura UI. QA07 independiente
activado sobre ese SHA fijo, con probes y revisión sin escritura de producto.
Developer continúa UI/cobertura en su checkout. API completa reserva3001 de forma
exclusiva; Playwright se coordina, sin suites competidoras sobre los mismos puertos.

### QA07 — revisión inicial del backend
QA independiente sobre3834ca9: suite enfocada3 PASS/36 aserciones, sin atribuir
cobertura UI. Dos brechas reproducidas enviadas a Developer: detalle omitía hechos
con mismo ID de Ciclo pero periodo visible cambiado; replay aceptaba campos extra
derivados antes de validación estructural. Sin mutación de hechos ni bypass
financiero demostrado. Se corrigen dentro del contrato aprobado AC07/09/21,
con regresiones. Continuidad productiva/restore/procesos y UI requieren candidato
ampliado; no se declara aceptación global ni PR lista.

### Candidato ampliado y revisión de correcciones
DEV07 SHA5787c39 añade UI de operación/historial y regresiones O8 de los dos
hallazgos iniciales. Developer informa8 pruebas nuevas/154aserciones PASS,
typecheck PASS y regresión enfocada41/862 PASS; suite completa final pendiente.
O4/O7 cubren continuidad v7 con historia/MFA demo/productiva ficticia, restore y
concurrencia real; QA los contrastará de forma independiente. Primer run íntegro
94/100 con6fallos estructurales conservado, sin rebajar reglas ni ocultar fallos.
QA07 reactivado sobre5787c39; Developer amplía E2E y validaciones finales.

### Verificación global bloqueada y análisis acotado
Candidato53cc238 (código/E2E d63442e): Developer informa Playwright2 PASS/47,6s,
types/build y controles PASS. Suite API completa105 PASS/1 FAIL de106: escenario
heredado E1.4 de apertura concurrente v3, operación upgrade/fase open, SQLite
UNCLASSIFIED errno11 en database-identity.ts:13:6. Una repetición afectada12/270
PASS y un único control base c04dc07 de coordinador1/18 PASS NO cierran ni
atribuyen ese fallo. AC23/gate global permanece BLOQUEADO.

Bajo la excepción expresa del usuario para un bloqueo demostrado se permite
triage limitado en lectura/probe para distinguir handle immutable frente a live;
no cambios de apertura/guardas, no bucles hasta verde, no reanudación Dev32.
Se aporta resumen B5 ya recuperado para no repetir investigación ni atribuirle
nuestro errno11 por analogía. Si requiere alterar frontera de seguridad o alcance
externo, se detiene para decisión expresa. QA07 revisa producto/AC/diffs de53cc238
en paralelo sin servidores ni duplicar diagnóstico. No se declara entrega lista.

### Cierre QA funcional y bloqueo residual
QA final53cc238, código d63442e: sin nuevos defectos funcionales; hallazgos iniciales
corregidos. Ejecuciones propias: suite enfocada8/154 PASS, probes3/22 PASS y
O9 adicional1/17 PASS. Revisó E2E real2 PASS/47,6s y capturas, código/historial
publicable sin borrados, bases, secretos ni datos reales observados. Dictamen
funcional favorable; aceptación global sigue BLOQUEADA (API105/1, AC23).

Triage único con dos procesos y barrera no reproduce errno11: ambos exit0,
lecturas immutable/live correctas y DDL8 ejecutado una vez. No identifica handle
del fallo original ni prueba causa. Apertura/guardas idénticas a main c04dc07,
sin cambios de producto por diagnóstico. No hay corrección causal propuesta.
El próximo diagnóstico posible sería instrumentación por handle/etapa en ruta
heredada, separado del producto E2.1 y sin reactivar Dev32; no se introduce aquí.

Entrega prevista: PR funcional DRAFT con evidencia y bloqueo explícito; verificar
CI por SHA sin convertir un éxito posterior en cierre del fallo local. Ningún
merge autorizado. Los 3 contratos futuros siguen PENDING y E2.1-AC2 hasta Comida.


### Handoff de sesión — 2026-10-22 — STOP REQUESTED — NO AUTO-RESUME

E2.1 queda congelado a petición expresa del usuario. Checkpoint e inventario:
[progress07, apartado Handoff](07-ciclos-operacion-progress.md#handoff--2026-10-22--stop-requested--no-auto-resume).
Origen publicado7b7cfce; código d63442e, QA53cc238. CI push39796609691 SUCCESS
no cierra API local105 PASS/1 FAIL errno11: AC23/global BLOQUEADO. No existe PR
funcional de esta rama. No se crea PR ni se continúa investigación o desarrollo.
Runtime sin trabajadores visibles; controles dev07/qa07 not_found, terminación
de proceso no confirmable. Dev32/PR30/AC22 continúa pausado. Próxima sesión:
leer checkpoint y verificar estado antes de proponer continuación; requiere nueva
instrucción del usuario, sin auto-resume.
