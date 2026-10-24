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
