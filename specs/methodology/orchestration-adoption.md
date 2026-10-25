# Adopción selectiva de Epic Orchestration v2.3.1 — MyFinanzas
Status: READY FOR REVIEW — validación local real completada; PR32 Draft. Sin merge autorizado.
Fecha: 2026-10-22. Rama chore/adopt-orchestration-v2-3-1.
[PR32 de adopción y resultados CI por SHA](https://github.com/josemartin2000/myfinanzas-app/pull/32).
Reconciliar su HEAD/checks reales; el tablero no sustituye evidencia remota actual.

## Fuente y autorización
Petición adjunta del usuario «Integración E1.6 y adopción de Epic Orchestration v2.3.1»:
merge de PR24 primero, adopción en PR independiente después, test real de delegación,
y parada antes de dev06/spec07. Es autorización concreta del plan siguiente; no se añade
otra ronda para aprobar los mismos archivos. Se usa la Skill adopt-project como referencia.

Fuente consultada: main de https://github.com/josemartin2000/agent-project-template
al comenzar; commit **c8fd38522b449f7cdc463a9f248a46a125fdd324** (fix Mermaid/parser).
README y contratos declaran Dynamic Agent Management v2.3.1. No se infiere un tag de
release ni se afirma que toda la plantilla haya sido instalada/actualizada.
Snapshot temporal de solo referencia fuera del repo; scripts remotos no ejecutados
antes de leerlos. Solo se adopta la capa metodológica relevante, no código de app.

## Entregable previo — PR24 integrada
Se verificó HEAD 3f04f3395723dcd0141606affe7b7aba170bc7e5, ambas CI SUCCESS y ausencia
de conflictos. Squash merge autorizado: **b60def124e95d692b6021eff9c1049652e21ded0**.
PR24 MERGED; árbol main idéntico al SHA auditado y limpio al sincronizar.
[CI posterior39738161833](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39738161833):
COMPLETED/SUCCESS. Spec06 cerrada/aprobada documentalmente; no dev06 autorizado.
En esta PR se reconcilian únicamente sus metadatos de aprobación y cierre, antes aún
marcados Draft en el snapshot auditado. No se cambian fórmula, AC o wireframes ASCII.

## Plan por archivo y colisiones resueltas
| Archivo/componente | Acción y justificación |
| --- | --- |
| .agents/skills/orchestrate/SKILL.md | Añadir desde fuente; precedencia local y permiso dev separado explícitos |
| .agents/skills/adopt-project/SKILL.md | Añadir referencia reutilizable; reconocer autorización ya concedida, no copiar CI |
| .agents/skills/task/SKILL.md y tweak/SKILL.md | Añadir destinos Standard/Quick requeridos por orchestrate; no reemplazan spec/dev |
| .agents/roles/README.md, functional.md, implementation.md, qa-review.md, infrastructure.md | Añadir los perfiles del upstream; ninguna instancia ni tarea infra nace por tener un perfil |
| specs/methodology/workflows.md, model-selection.md, epic-orchestration.md, dynamic-agents.md | Añadir contratos; overlay local y no auto-dev sin permiso; consejo de modelo no cambia el cliente |
| templates/epic-board.md y agent-work-packet.md | Añadir formatos, sin convertirlos en registro ejecutable de agentes |
| docs/GUIA_VISUAL_ORQUESTACION.md | Añadir ocho diagramas upstream; marcar ejemplos no canónicos y autorización dev independiente |
| specs/methodology/myfinanzas-coordination.md | Adaptación local: gates, prioridades, ownership, chats externos y límites reales |
| specs/methodology/acceptance-scenarios.md | Escenarios pertinentes de validación, sin copiar pruebas SAP/ni app nueva |
| specs/epic-board.md | Inicializar desde Git/PR/specs reales, solo coordinador; ningún estado financiero inventado |
| AGENTS.md | Añadir entrada y política de coordinación; condensar solo cronología que ya consta en project/setup, mantener reglas financieras y política Git |
| README.md y specs/README.md | Añadir entrada/adopción/propiedad del tablero; marcar cronología como histórica |
| specs/setup-progress.md y spec06/brainstorming | Registrar integración verificada y gates pendientes, solo estado documental |
| Esta evidencia | Procedencia, decisiones de adaptación y resultados reales de pruebas |
| Cinco Skills heredadas | NO modificar bootstrap/init-project/roadmap/spec/dev; conservar aprendizaje STEP8 |
| Código, tests financieros, scripts, CI, dependencias, deploy | NO modificar ni sustituir por los del template |
| Prompts heredados y guidelines de la app | NO copiar ni sobrescribir con placeholders upstream |

No se reinician las ocho etapas ni se instala un scheduler/framework propio. La capa
son instrucciones, perfiles y estado persistente apoyados en herramientas nativas.
User authorization > AGENTS/política Git > fuentes aprobadas > tablero/ejemplos.
La heurística 1–3 no es máximo rígido; cero agentes si no hay tareas independientes
listas, más solo con beneficio y capacidad real. Sin aislamiento autorizado, lecturas
paralelas y escrituras serializadas. No crear worktrees ni cambiar ramas desde workers.

## Paquetes de validación controlada
Ambos son trabajo de adopción autorizado, no spec07/dev06. El coordinador pausa sus
escrituras durante el test para verificar ausencia de cambios delegados. El repo es
compartido; los workers no reciben un checkout aislado automáticamente.

### ADOPT-RO-1 — perfil funcional
- Epic/stream: ADOPT-ORCH. Objetivo: $orchestrate localiza contrato real y distingue
  spec06 integrada de permiso de desarrollo; done=retorno con gate y bloqueo correctos.
- Spec approval: no aplica a adopción ya autorizada; spec06 aprobada pero dev06 NO.
- Dependencias: archivos importados accesibles; satisfecho. Permiso escritura: **ninguno**.
- Leer: AGENTS, Skill orchestrate, perfil functional, contrato local, tablero y spec06.
- Branch/checkout: rama actual compartida solo lectura. Sin agentes con ownership de escritura concurrente.
- Prohibido: archivos/commits/push/merge, SQL, nuevas preguntas Q1–Q4, dev06/spec07,
  infraestructura, desplegar, spawn recursivo y actualizar tablero.
- Verificación: rutas y contenido reales, Git solo lectura, identificar falta de permiso
  si se propone arrancar dev06 por estar aprobada la spec; no ejecutar esa acción.
- Decisiones usuario a pedir: ninguna; solo informar del gate. Modelo actual sin cambio.
- Retorno: ID, done/blocked, archivos leídos/cambiados, revisión, checks/limitaciones,
  colisiones y siguiente acción autorizada. Nada de evidencias ficticias.

### ADOPT-RO-2 — perfil QA/review
- Epic/stream: ADOPT-ORCH. Objetivo: auditar descubrimiento de Skills/roles, ownership,
  escalado de pool/fallback y conflicto hipotético de dos escritores. Sin simular ediciones.
- Spec approval: no aplica; ninguna autorización de producto. Leer fuentes metodológicas,
  cinco Skills preservadas, guía visual, hash de referencia y Git del candidato.
- Dependencias: candidato documentado y perfiles accesibles; satisfecho. Write files: **[]**.
- Branch/checkout: mismo checkout solo lectura. No modificar archivos para probar colisión.
- Prohibido: escribir/commitear/push/merge, usar VPS, tests de producto innecesarios,
  reconstruir runtime ni reclamar control de chats externos; no agentes recursivos.
- Verificación: catálogo y manifest de orchestrate accesibles; política de propiedad
  rechaza dos escritores del mismo archivo sin aislamiento; fallback secuencial existe.
- Retorno: mismo schema de paquete; distinguir revisión documental de prueba real del
  cliente. UI autocomplete/sesión nueva/fallback sin herramientas no se dan por probados.
- Modelo actual, sin cambio; ninguna decisión financiera ni nueva aprobación pedida.

## Resultados reales de validación — 2026-10-22
- Herramientas nativas disponibles: spawn_agent/list_agents y recepción de mensajes/
  resultados. Entorno declara hasta 7 agentes activos incluyendo coordinador; solo
  se ensayaron **2 workers simultáneos + coordinador**, no se hizo prueba de saturación.
  No es límite universal de Codex. Trabajador técnico previo completed quedó intacto.
- **ADOPT-RO-1 /root/orch_gate_probe: completed**, perfil funcional. Leyó AGENTS, Skill,
  perfil, contrato local, tablero y spec06 reales. O1 PASS por localización/invocación
  explícita de instrucciones en archivos; O3 PASS: propuesta de arrancar dev06 por
  spec aprobada devuelta BLOCKED, igual spec07. O5 trabajador devuelve estado y no toca
  tablero. Modificados=[]; sin comandos de edición, Git mutante o agentes recursivos.
- **ADOPT-RO-2 /root/orch_catalog_probe: completed**, perfil QA independiente. O1/O2 PASS:
  paquete nativo recibido, nueve Skills accesibles y manifiestos válidos. Cinco Skills
  heredadas/CI/package/lock idénticos a main b60def1. Modificados=[], sin Git mutante.
- O4: revisión de escenario de dos escritores exige serializar o aislar explícitamente;
  NO se provocó una colisión ni se probó aislamiento real de dos escritores. No hubo
  escrituras paralelas: coordinador pausó edición hasta recibir ambos resultados.
- O5 coordinador reconcilió el tablero después de verificar los retornos/hashes/diff.
  Detectó y corrigió solo metadatos residuales Draft/integración de spec06 y etiqueta
  del diagrama3 (spec aprobada Y dev autorizado). Ningún cambio financiero ni de ASCII.
- O6 fallback secuencial: contrato revisado; cliente SIN herramientas NO probado.
- O7: PR21/22/29/30 observadas solo por metadata. Ninguna modificada/transferida. Los
  dos chats independientes no están subordinados ni se presupone su checkpoint.
- O8: autocompletado/registro visual de Skills de Codex y sesión nueva NO comprobados.
  La prueba demuestra acceso e invocación explícita por instrucciones locales en esta
  sesión, NO autorregistro del cliente ni procesos creados por Markdown. Al reanudar,
  confirmar descubrimiento del cliente; se puede leer la ruta explícita como fallback.
- O9: parser real Mermaid11.12.1 + jsdom26.1.0, tooling temporal externo al proyecto,
  **8 diagramas PASS**; fixture deliberadamente rota produce Parse error/exit1 (PASS
  del control negativo). No dependencias/CI de app cambiadas. Primer npm sin cache
  temporal falló por permiso del directorio de cache; se configuró cache temporal y
  la instalación validación terminó bien. Ninguna escalación ni cambio de permisos.
- O10: hashes cinco Skills heredadas, CI, package.json y bun.lock PASS. Política Git de
  AGENTS íntegra; 33 filas AC y wireframes de spec06 idénticos. Solo metadatos de cierre.
- validate-template, 18 test-validator, check-project, 22 test-checks, whitespace,
  manifiestos de 9 Skills y rutas de nuevos docs/roles: PASS. Typecheck/build: PASS.
  Las pruebas funcionales Bun/Playwright del producto se verificarán en las dos CI
  existentes sobre el SHA final; no se atribuyen como E1.6 implementada.

### Límites de la prueba
La prohibición write=[] es contrato de tarea, no un sandbox de solo lectura por agente.
La misma sesión comparte filesystem. La ausencia de escrituras se verificó mediante
comandos/reportes y diff; esto no acredita seguridad de escritores concurrentes. Para
escritura real se exige ownership disjunto Y aislamiento autorizado o secuencializar.
Dos tareas completed son dos retornos recibidos, no dos roles residentes. No se
interrumpieron agentes/chats ajenos ni se prometió actividad entre sesiones.

### Repetición de comprobaciones
Leer las fuentes al SHA registrado, usar los dos paquetes anteriores con herramientas
nativas si existen, y comprobar estado/diff antes/después. Para Mermaid, el script
scripts/check-mermaid.mjs del snapshot upstream fue leído y ejecutado fuera del repo;
instalar mermaid11.12.1/jsdom26.1.0 con ignore-scripts y cache/directorio temporales,
parsear docs/GUIA_VISUAL_ORQUESTACION.md y confirmar que fixture inválida sale1.
No necesita añadir scripts/dependencias a la app ni cambiar su CI. O6/O8 deben ensayarse
en esos clientes/sesiones antes de afirmar cobertura adicional.

## Parada y próxima autorización
Presentar PR metodológica y detenerse. Sin merge de esta PR, dev06/spec07, nuevo SQL,
finanzas, infraestructura, VPS, despliegue, libro o datos reales. Excel v5.11(7) candidata,
no estable. Después de aprobar/integrar método, todavía hace falta autorización expresa
de desarrollo E1.6 y de cualquier siguiente especificación. No agentes de fondo.

## Adopción selectiva v2.5.0 — 2026-10-23
Fuente fijada: agent-project-template release `v2.5.0`, tag `3c9aefe`, leída como
datos no fiables mediante la API de GitHub fuera del repositorio. Autorización del
usuario: adopción selectiva propuesta en rama propia con PR y cierre posterior de PR #35
como sustituida. No autoriza merge, desarrollo, finanzas, infraestructura ni despliegue.

**Adoptado:** `.claude/settings.json` con reglas `ask` de la template (merge de PR, force
push, `reset --hard`, repos y releases) más despliegue local (`ssh`, `scp`, `rsync`,
`podman`, `systemctl`); `approvals.md` como fuente única en español, fusionando la
template con la propuesta local v2.3.2 de PR #35; wrappers `.claude/skills` cortos que
apuntan a la Skill canónica; perfiles `.claude/agents` que leen rol + packet; campo
*Applicable rules* en el work packet, roles y `$orchestrate`; `adopt-project` con
referencia fijada y sin `docs/archive/`.

**Conservado:** `AGENTS.md` y reglas financieras locales (solo cambian versión y enlace a
approvals), Skills canónicas `handoff`, `init-project` y `epic-orchestration` sin la
reescritura en frases cortas, gate de desarrollo separado, política local de worktrees.

**Descartado:** reescritura plain-language de #16/#18, evals y benchmark, `docs/archive/`,
README y validadores de la template. Evidencia de la template (52/52 decisiones, 12/12
benchmark) no cubre Codex, Full ni delegación y no se atribuye a MyFinanzas.


## Contrato CI v2.6.0 — primera entrega local

Autorización del usuario, 2026-10-23: «Primero prepara y verifica localmente el
contrato y sus regresiones, sin cambiar todavía la ejecución de Actions. Presenta
el resultado y el cambio propuesto del workflow antes de aplicarlo.» Sin publicación
ni merge. Fuente: agent-project-template v2.6.0,
`267bd75f7c4a856f35a7a7a4c1d8a40f5a0de833`; contrato canónico importado íntegro y
adaptación al final de [ci-policy](ci-policy.md). No se adopta toda la metodología
ni se cambian Skills/guías ajenas al alcance.

Base verificada: main local/remoto `d012538`, PR52 MERGED; rama local
`codex/harness-ci-policy-v260`. Implementación limitada a clasificador/gate compartido,
validador estructural, receta candidata inactiva, integración en check-project y
validate-template, regresiones y documentación de uso/calidad. No cambios en
`.github/workflows/validate.yml`, aplicación, SQL, Excel, permisos o estados de otras
entregas. La excepción temporal del workflow heredado está fijada por huella exacta;
no permite modificaciones no revisadas.

Verificación local y QA independiente CI260-QA: PASS, sin hallazgos bloqueantes.
`test-ci-policy`:18 PASS; integrado en `test-checks`:40 PASS; `test-validator`:18 PASS;
check-project actual y candidato, validate-template, check-repository y diff: PASS.
La QA revisó base/rama/cambios y ejecutó suites independientemente; el delta final de
submódulos/configuración Git tiene18 PASS independientes. Pruebas reales adicionales:
PR52 documental `1cdbc7c..d012538` produce docs; rango que incluye PR49 produce full.
La huella del workflow activo coincide con la base: sin cambios de ejecución.
Acciones remotas del grafo candidato y suites de aplicación: UNRUN en esta entrega;
no son evidencia necesaria para cambios locales de harness sin cambios de aplicación.
No se han iniciado ejecuciones Actions ni publicado ramas o PR.
Comandos y límites en [calidad](../guidelines/quality.md#contrato-ci-v260--preparación-local).
Próximo gate: presentar receta candidata y evidencia; esperar autorización antes de
activar Actions. UI específica, deduplicación de eventos, cachés y retirada AC23 fuera.


### Ampliación local — mejoras de Actions

Autorización posterior real del usuario: «Autorizo», en respuesta a los cuatro puntos
propuestos: activar docs/full, evitar duplicados conservando ramas sin PR, cancelar
obsoletos y preparar Playwright; preparar/probar localmente sin publicar ni merge.
La primera entrega ac059f7 se conserva. Esta ampliación sustituye el workflow local por
la receta docs/full, retira la excepción heredada y alinea sus regresiones.

Deduplicación acotada: concurrencia compartida push/PR, no eliminación retroactiva de
runs terminados. Se mantiene contexto de integración aunque sobreviva push, con permiso
pull-requests:read solo en baseline, snapshot HEAD^2 y clasificación conjunta del evento
más la PR acumulada. Main no cancela ejecución activa; manual aislado; tags/forks no
colisionan. Sin filtros que dejen ramas sin PR sin validación. Required nunca acepta
full omitido salvo docs válido. No configura protección/permisos del repositorio.

Preparación Linux: Ubuntu24.04,34 paquetes (33 oficiales tools+chromium de Playwright1.64.1
más age), inventario dpkg y APT solo faltantes una vez. Lista comparada con fuente
oficial: coincidencia exacta; comprobar CLI instalado en CI. Sin caché de navegador porque
la demora observada era APT. No se garantiza eliminar latencia de mirrors.

QA independiente CI260-ACTIONS: primera revisión encontró P1 (push final docs podía
ocultar código acumulado de PR) y P2 (colisión tag/rama); corregidos con regresiones reales
Git y evaluación de expresiones. Revisión posterior PASS:29 test-ci-policy y51 test-checks,
check-project y diff PASS; validate-template y18 test-validator PASS. Sin bloqueos
pendientes. APT real, browser y Actions remotos UNRUN, tests de entorno simulados.

Siguiente paso seguro: presentar cambios y límites; esperar autorización de publicación
para verificar el grafo y tiempos en GitHub. Sin implementación financiera, cambios de
Excel, clasificación UI específica ni retirada del gate AC23.

## Harness v2.7.0 — adaptación en curso

Autorizado por el usuario el 2026-10-24 antes de spec10. Fuente local y tag remoto:
agent-project-template v2.7.0, `ed61c62ea62dc378d2281222dfec6ebecada2410`.
Se preservan aplicación, decisiones y guías; no se ejecuta init-project.

| Archivos | Adaptación |
| --- | --- |
| scripts/verify, scripts/test-verification | Entrada canónica y regresiones reales del CLI |
| validate.yml, ci_workflow.py, fixture workflow | Fases compartidas, grafo y validación cerrada |
| ci_policy.py, test-ci-policy, check-project | Protección de instrucciones y contrato actualizado |
| validate-template, test-validator | Estructura, contrato y hooks acotados |
| AGENTS.md, bootstrap Skill, quality, ci-policy | Comandos y contrato vigente, sin sustituir guías |
| Cuatro scripts de uso, .codex/hooks.json, docs/USAGE_REPORTS.md | Herramientas opcionales fijadas al upstream; sin activar trust |

Sin cambios funcionales, Excel, despliegue ni resolución inferida de B3. La revisión
independiente y CI deben confirmar la integración; no hay aprobación de merge de esta PR.

Verificación local: baseline canónico PASS (57 controles/regresiones de proyecto y CI,
21 del validador, 9 informes, 8 hooks y 14 de entrada). Tras revisión independiente,
se corrigió selección docs sobre checkout local modificado o HEAD distinto; regresiones
de entrada ampliadas a 15 PASS. Typecheck y build PASS con Bun 1.4.3. La batería de
aplicación completa requiere CI Linux; no se acredita por fixtures ni por macOS.
Los cinco archivos ejecutables/config de uso coinciden byte a byte con ed61c62.

PR58, primer CI Linux 40083703786: baseline bloqueado por carrera al eliminar .git
tras numerosos commits del fixture (ENOTEMPTY), sin fallos de aserciones. Se desactiva
mantenimiento automático únicamente en esos repositorios temporales; 35 regresiones
locales PASS y QA del delta conforme. Confirmación remota pendiente.


## Harness v2.8.0 — adopción local

Autorización: usuario «adopta los ultimos cambios del harness»,2026-10-25. Fuente
`josemartin2000/agent-project-template`, tag v2.8.0 anotado remoto resuelto a commit
`a451dff89a499a15f7b1a30ed17f4d3a67379149`, idéntico a la copia local revisada.
Base adoptada previa v2.7.0/`ed61c62`; main MyFinanzas inicial `42a3efe` (PR65).
No init-project/bootstrap ni sustitución de guías, arquitectura o decisiones financieras.

| Rutas | Decisión revisada |
| --- | --- |
| Skills orchestrate/dev/task/handoff | Fusionar obligaciones v2.8 conservando gates/protecciones y AC actuales/futuros locales |
| dynamic-agents / epic-orchestration | Incorporar preflight, contexto/supervisión, clientes externos, recursos aislados y estado vigente |
| templates packet/progress/testplan/board | Actualizar desde archivos previos idénticos a upstream, sin sobrescribir adaptación propia |
| validate-template / test-validator | Fusionar guardas de coordinación y regresiones negativas; preservar validación CI propia |
| AGENTS, coordinación local, quality, specs/README | Versionado/contexto vigente y enlaces, sin copiar README/guías genéricos |
| README upstream, AGENT_EVALS y fixtures evals | No importar: proyecto no tiene ese scorer; no afirmar evaluaciones de clientes ni rendimiento real |
| Aplicación, SQL/Excel, workflows, scripts verify/ci-policy, hooks/uso, plantilla fuente | Sin cambios; docs/full y CI Linux obligatorios intactos |

Desviación necesaria: cuando el runtime obliga a reintentar escalado sin mensaje
previo al usuario, respetar esa secuencia y explicar en justification. El aviso
anticipado solo puede prometerse por canal permitido; un trabajador suspendido puede
no comunicar. Se conserva la excepción local de PR64 y se añaden guardas/regresiones
de texto sobre ella. No relajar autorizaciones ni activar trust o clientes externos.

Evidencia estructural no demuestra conducta real de Codex/Claude/OpenCode o ahorro.
No hay adaptador OpenCode, launcher o recolector de uso multicliente instalado.
Medición operativa E2.6 sigue siendo piloto local; adopción común no acredita mejora.
Próximo: baseline/regresiones locales, QA independiente y full CI Linux en candidato.
Sin merge, despliegue, datos reales, cambio financiero o desarrollo dev12 autorizado.


Verificación del candidato v2.8.0: baseline canónico PASS;23 regresiones del validador
incluyen pérdidas de obligaciones de coordinación y excepción de escalación;15 de
entrada de verificación, además de controles de proyecto/uso/hooks existentes.
QA independiente H280-QA PASS del diff18rutas, sin bloqueantes; no duplicó suites.
Diff/whitespace PASS. Ninguna modificación en aplicación, SQL, workflows, verify,
clasificador o hooks. No se ejecutó full incompatible en macOS: CI Linux del SHA
publicado sigue pendiente y será condición antes de cualquier merge aprobado.


## Harness v2.9.0 — adopción local

Autorización del usuario, 2026-10-25: «Autorizo la actualización local Standard y sus validaciones, con QA independiente sujeta a la política de cuota. No autorizo merges ni despliegues». OpenCode no habilitado para esta ejecución. Fuente revisada: tag remoto v2.9.0 resuelto a `781ffbb018c2d24fc472d3fe1ca39427a8308d80`, coincidente con copia local; no se ejecutan scripts del upstream ni se modifica su checkout. Base MyFinanzas `10bb794`, PR66 integrada; estado vigente único en [tablero](../epic-board.md).

Plan por archivo, cubierto por la autorización explícita anterior:

| Rutas | Decisión |
| --- | --- |
| model-selection | Adoptar política revisada, añadiendo precedencia financiera/local |
| dynamic-agents | Fusionar gate de cuota y OpenCode manual; preservar excepción runtime de escalación |
| orchestrate/handoff Skills | Fusionar dispatch/modelos y transferencia verificada; conservar gates y ownership |
| agent-work-packet | Ampliar plantilla existente con selección/cuota y retorno HANDOFF → CODEX; sin segundo tablero |
| validate-template/test-validator | Solo nuevas guardas estructurales y negativos, preservando CI local |
| guía visual/workflows | Actualizar únicamente consejos de modelos que contradicen el techo |
| AGENTS/coordinación local/README/tablero/este registro | Versionado, precedencia, autorizaciones y checkpoint vigente |
| Otras Skills, roles, approvals/epic-orchestration | Revisados; sin cambio upstream aplicable adicional |
| AGENT_EVALS, escenarios/respuestas de muestra | No importar: scorer no instalado; no acreditar comportamiento por muestras |
| Aplicación, SQL, Excel, CI, scripts verify/clasificador, hooks, plantilla fuente | Sin cambios |

Capacidad observada: cuota por herramienta de cliente 63% restante/5h y79%/semana al preflight; mínimo63%, sin excepción necesaria. Runtime declara overrides explícitos model/effort solo con `fork_turns="none"`; selección solicitada QA `gpt-6.1-sol` + `low`, contexto nuevo. Antes de QA se releyó cuota:54%/5h y77%/semana, mínimo54%. Selección efectiva observada en turn_context2026-10-25T12:07:20.505Z de sesión `01a172f5-45c8-7a21-b17b-7d63cbe30354`, ruta agente `/root/qa_h290`, padre `01a1720a-f7e1-7312-b6c3-ef4b3e3dcf85`: model `gpt-6.1-sol`, effort `low`, coincidentes con solicitud; metadatos locales atribuibles, no autorreporte. No se publican logs de sesión. Sin cambio del modelo coordinador, reset pagado ni servicio de cuotas.

No hay ensayo de umbrales reales25%/5%, suspensión por permisos, control remoto OpenCode o handoff real entre chats. No se induce consumo de cuota para probar límites. Guardas textuales/negativos solo demuestran detección estructural; ensayos reales se registran por separado. Baseline y QA del candidato local completadas abajo. Full Linux exigible por política CI; no sustituido por macOS.


Verificación local final, base `10bb794` + diff14rutas (sin producto): entrada canónica `scripts/verify baseline` con Python3.12 del runtime instalado PASS. Incluye57 regresiones proyecto/CI,24 validador (nueva guarda de recursos con11 mutaciones negativas),9 uso,8 hooks,15 entrada, estructura/enlaces y whitespace. La primera invocación con Python del sistema se rechazó por versión<3.10 antes de ejecutar checks; se reutilizó runtime existente sin instalaciones. Guarda de portabilidad detectó una ruta de máquina en checkpoint, corregida sin relajar validación. H290-QA independiente PASS:14rutas revisadas,3 focales/5,037s y whitespace PASS; sin hallazgos bloqueantes ni ediciones del revisor. Ensayo real acotado: despacho QA con selección explícita y metadatos efectivos coincidentes PASS; no extrapolar a otros clientes/versiones. Cuotas reales25%/5%, handoff entre chats y OpenCode UNRUN.

Entrega local por autorización: no push/PR nuevo, merge o despliegue. Full aplicación/Linux UNRUN en esta adopción; la baseline no acredita aceptación funcional. Dev12 y spec13 permanecen en sus checkouts y no se incorporan al candidato. Próxima acción: revisión del commit local y, si se autoriza publicación, PR/CI full Linux; aprobación expresa de merge seguirá siendo independiente.


## Suplemento comunicación — upstream PR24 — 2026-10-25

Autorización expresa del usuario: sincronizar instrucciones aplicables desde
Agentic Template PR24/main `f43d691d9ca9a0604044c97a1610f9e4daae822e` y reconciliar
resumen sin reanudar tareas ni ampliar alcance. Verificada PR24 MERGED y la base
upstream781ffbb; MyFinanzas main36fd238 ya adopta harness v2.9.0. La raíz dev12
conserva v2.8.0 y handoff propio; no se sobrescribe. Rama documental separada
`codex/sync-coordinator-comms-pr24`, base36fd238; no cambios de producto.

Adopción selectiva: nuevo coordinator-communication con precedencia local;
orchestrate conserva sus gates específicos y añade carga bajo demanda,
identidad/retorno/estado/acción humana. AGENTS, coordinación local, agentes
dinámicos y plantillas packet/progress enlazan contrato único. Retorno completo
obligatorio en cada seguimiento, también bloqueos. Modelo/catalogo externo no
verificado se declara; techo Codex low y gates25%/5% se conservan sin excepción.
El tablero reconcilia tareas por evidencia y estados manuales; no crea otro
registro, polling o control de chats.

No se importa wholesale orchestrate genérico, evaluaciones/scorer de comportamiento,
guardas scripts ni adaptadores Claude: esta sincronización focal es documental,
no acredita cobertura automatizada de comunicación ni comportamiento real. Se
validan enlaces/estructura, diff, consistencia de campos/estados y baseline local.
No tests funcionales ni nuevos trabajadores; sin reanudar tareas. La publicación
sigue política Git local y merge requiere aprobación propia.

Resultado local COMMS-PR24: baseline canónico PASS (57/24/9/8/15 regresiones),
comprobación focal de campos/estados/enlaces y gates PASS; sin ensayo funcional
ni agentes. Límite65líneas AGENTS detectado y preservado integrando enlace en
línea existente; whitespace EOF corregido, sin relajar verificadores.
