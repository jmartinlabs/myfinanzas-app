# MyFinanzas — coordinación y precedencia local

Contrato local adaptado incrementalmente de agent-project-template hasta v2.14.0 (`98b5351a72eae1df985819c01a47954e6a1a0836`), preservando coordinación ligera,
gates financieros y Skill `$handoff`. Contrato portable en [agentes dinámicos](dynamic-agents.md);
el piloto E2.6 conserva su medición y límites locales, sin afirmar mejora causal. Historia y procedencia:
[adopción](orchestration-adoption.md). No cambia el stack ni las ocho etapas cerradas.

## Autoridad y entradas
1. Instrucciones y autorizaciones expresas del usuario; política Git/GitHub de AGENTS.md.
2. Roadmap, especificaciones y decisiones aprobadas como fuentes canónicas. Referencia
   financiera única v5.11(7), candidata NO estable; jamás inventar reglas económicas.
3. Contratos de coordinación de esta carpeta y perfiles reutilizables. El tablero es
   un índice reanudable, no evidencia de aprobación por sí solo. Reconciliarlo siempre.

$orchestrate usa [Quick/Standard/Full por riesgo](workflows.md) sin volver a inicializar el proyecto; una petición Quick no autoriza decisiones financieras, desarrollo nuevo ni operaciones protegidas.
E1.6 conserva su Full/spec06 aprobada; no otra ronda Q1–Q4 ni documentos redundantes.
La metodología base está integrada desde PR #32 y actualizada selectivamente hasta
v2.14.0; sus reglas operativas se aplican a entregas futuras sin reinterpretar las
autorizaciones de negocio ni afirmar una adopción íntegra.
El coordinador conserva su modelo. Los subagentes Codex deben respetar el techo absoluto y la verificación de selección de [model-selection](model-selection.md); el [gate de cuota](dynamic-agents.md#quota-and-dispatch-gate) exige autorización por tarea cuando corresponde, incluida QA. OpenCode se habilita por ejecución, con traslado manual del paquete existente; no implica control directo.

## Reparto de responsabilidades — orquestador, asesor y usuario

Aprobado por el usuario el 2026-10-27. No cambia los gates de [approvals](approvals.md):
especificación, desarrollo, cambio de alcance, merge y despliegue siguen necesitando
aprobación expresa.

- **Orquestador técnico (OpenCode).** Único responsable de la ejecución: consolida los
  handoffs, coordina desarrollo, documentación, pruebas, QA, CI y PR, resuelve incidencias
  dentro del alcance autorizado y gestiona dependencias, ownership, bloqueos y seguimiento
  global. No traslada al usuario información técnica rutinaria que pueda resolver.
- **Asesor (Álex, ChatGPT).** Aporta criterio en decisiones financieras, funcionales y de
  arquitectura; no ejecuta, no asigna trabajo y no aprueba. Su recomendación no autoriza
  nada por sí sola.
- **Usuario.** Autoridad final y única fuente de aprobación protegida.

### Materias que exigen consulta

Reglas financieras, cálculos o interpretación de importes; comportamiento funcional de
cualquier dominio financiero (Ciclos, Cierres, Movimientos, Saldos, Anticipos, Compartidos,
Presupuestos, Inversiones y los demás); cambios estructurales que afecten al modelo
financiero, la integridad histórica o la fuente única de verdad; y contradicciones entre
especificaciones, criterios aprobados o decisiones anteriores.

La consulta se redacta con contexto imprescindible, alternativas, recomendación motivada y
consecuencias, y no se presenta como decisión tomada.

### Circuito de decisión

1. El agente entrega sus resultados al orquestador.
2. El orquestador resuelve lo puramente técnico y consolida el estado.
3. Si aparece una decisión material de las anteriores, prepara la consulta al asesor.
4. El usuario consulta, evalúa las alternativas y decide.
5. El usuario comunica la decisión; el orquestador la registra y coordina su ejecución.

No se duplica la coordinación ni el seguimiento entre OpenCode y el asesor. Una duda
material detiene solo el trabajo afectado; las tareas independientes ya autorizadas
continúan. Ante un dato o gate ausente se bloquea únicamente el despacho o paso afectado.

## Gates que NO desaparecen
- Especificación aprobada + dependencias satisfechas + autorización expresa de
  desarrollo de esa entrega: solo entonces dev puede pasar a ready. No basta que
  una PR de especificación sea MERGED. No hace falta volver a escribir $dev si ese
  alcance ya fue autorizado en la ejecución activa.
- La adopción metodológica de PR #32 no autoriza dev06 ni la especificación de E2.1.
  Cada nuevo alcance requiere su autorización propia; no se infiere de la metodología.
- E1.6 spec y wireframes están integrados en b60def1; sus 30 AC actuales NO están
  implementados/probados. AC31–33 siguen contratos de entregas futuras.
- E1.7 no existe en el roadmap aprobado, que termina E1 en E1.6 y continúa E2.1.
  La futura solicitud spec07/E1.7 necesita mapping explícito antes de asignarse;
  los ejemplos del upstream NO crean entregas ni alteran el roadmap.
- Mantener aprobaciones expresas, según [approvals](approvals.md), para finanzas, especificaciones, nuevo alcance,
  arquitectura material, destrucción, merges, datos reales, acceso a VPS y despliegues.
  Una autorización previa válida no se pide otra vez; tampoco se extiende por analogía.
- Git: rama por ámbito, revisión de historial y datos sensibles. Publicar rama y crear o
  actualizar PR es trabajo ordinario dentro del alcance autorizado; squash merge solo tras
  aprobación expresa de esa PR y checks, nunca auto-merge.

## Consumo de GitHub Actions — control mínimo

En hitos significativos —inicio/cierre de entrega, handoff y antes de un lote intensivo de CI— el coordinador consulta una vez el consumo mensual; no hace polling. Avisa al superar **1.600 min** (referencia GitHub Free) y **2.400 min** (referencia GitHub Pro), indicando plan, restante y renovación cuando Billing los muestre. No repite el mismo umbral en el mismo ciclo sin un cambio relevante. Billing/Included usage es la fuente de cuota; el total de la API incluye minutos gratuitos de repos públicos y no se usa sin filtrar a repos privados. Las alertas son informativas: no bloquean trabajo, CI, PR ni merge, y no modifican planes, presupuestos ni suscripciones. Las alertas nativas 90/100 % se activan en Billing y no sustituyen estos umbrales.

## Scheduler, propiedad y ejecución
Solo el coordinador escribe specs/epic-board.md, asigna ownership y reconcilia resultados.
Crear el menor pool útil para tareas independientes listas, no un número fijo por rol.
Preferir un único ejecutor por entrega; añadir subagentes solo si son independientes
y su valor supera el coste de coordinación. Comprobar las herramientas y límites reales antes
de ampliar. No inferirlos de Agents API ni del nombre Desktop/Web. No delegación recursiva
salvo alcance y autorización explícitos del coordinador dentro del permiso del usuario.
No duplicar tareas activas. Leer listado de agentes reales y checkpoints antes de asignar.

Cada delegado recibe un paquete compacto basado en templates/agent-work-packet.md, con gate,
dependencias, ownership, aislamiento, prohibiciones y comprobaciones de entrega.
No duplicar especificaciones ni dividir una tarea en microdelegaciones innecesarias. Roles funcional,
implementación, QA y infraestructura son perfiles; no procesos residentes.
- Lecturas concurrentes pueden compartir el checkout. Los permisos de escritura de
  cada paquete quedan limitados al alcance autorizado, su ownership y sus gates.
- Código concurrente: ownership disjunto Y checkouts efectivamente aislados. Una rama
  por sí sola no aísla un directorio compartido. Dentro de una tarea o épica de desarrollo
  ya autorizada, el coordinador puede crear y gestionar autónomamente ramas, worktrees
  temporales y checkouts aislados, sin pedir una aprobación por cada operación ordinaria.
  Antes debe verificar soporte real, estado Git, cambios preexistentes y riesgos de colisión.
  Si no existe aislamiento seguro, serializar escrituras sin bloquear lecturas paralelas.
  La limpieza se limita a recursos temporales propios y sin trabajo pendiente; jamás
  descartar cambios ajenos o sin reconciliar.
- QA independiente del autor de implementación; tests reales solo cuando exista candidato.
  Diseño de pruebas no es PASS; revisión de un contrato futuro no lo implementa.
- Sin herramientas multiagente: misma cola y gates en secuencia, sin delegación fingida.
- Reconciliar estado al inicio y en hitos (aprobación, candidato, QA, bloqueo o PR),
  verificando los cambios relevantes de Git y tests; no releer todo tras cada mensaje.
  Si no queda trabajo autorizado, guardar estado y detenerse; no abrir infraestructura
  para mantener ocupado el pool.

## Parada y transferencia de sesión
`$handoff` (Claude `/handoff`) congela nuevo trabajo, solicita detener solo agentes
realmente controlables y deja checkpoint mínimo en progress/board o
`specs/session-handoff.md` si no hay documento adecuado. No ejecuta QA nueva, merge,
despliegue ni reanudación. Una ejecución interrumpida por cuota no garantiza checkpoint.
Solo el coordinador puede editar epic-board; delegados conservan su propio progreso.
Las autorizaciones existentes no se amplían ni desaparecen por un handoff. Un informe
intermedio o un check corregible no cierra el turno mientras quede trabajo autorizado:
investigar, corregir y repetir la verificación. El cierre declara responsable, acción
humana exacta y estado/motivo de espera conforme a [comunicación](coordinator-communication.md#7-closing-a-turn-or-stopping).

## Comunicación manual — adaptación focal v2.10.0/v2.14.0

Adaptación focal de agent-project-template v2.10.0, PR24/`f43d691`, revisada contra
v2.14.0/`98b5351`, sobre harness local v2.9.0, sin sustituir sus contratos.
[Comunicación del coordinador](coordinator-communication.md) exige Task ID y sesión
funcional estables, retorno `HANDOFF → CODEX` completo en cada seguimiento (también
bloqueos), procedencia del estado, acción humana exacta y motivo de espera al cerrar.
Traslado manual por usuario; no controla chats ni cambia gates de cuota/modelo,
finanzas, QA independiente, desarrollo por entrega o merge. Un reporte recibido
no es resultado verificado. La publicación autorizada de rama/PR no aprueba merge.
Reconciliar por hitos desde el único resumen actual; consultar estado completo no
autoriza escrituras ni reanudación.

## Chats existentes y reanudación
Chats financieros/infraestructura externos no son nuestros subagentes y no podemos
controlarlos, cerrarlos ni asumir su contexto. Antes de transferir trabajo, incorporar
checkpoint de cada dueño: objetivo/alcance autorizado, rama/SHA/PR, cambios sin commit,
decisiones, comandos/resultados, bloqueos y próximo paso. Verificar Git sin sobrescribir.
Mientras no haya checkpoint, marcar externo/no verificado; no reasignar ni duplicar.
Reanudar desde el último checkpoint verificando deltas de Git/PR y autorizaciones;
leer tablero, specs y testplans completos solo cuando sea necesario. Un handoff nunca
autoriza reiniciar automáticamente el desarrollo.
No prometer actividad después del turno ni agentes trabajando entre sesiones.

## Piloto de eficiencia — spec10 / E2.4

Autorizado por el usuario el 2026-10-24: revisar mecanismos existentes, registrar
el piloto y medirlo antes de cambiar la plantilla. Se aplica a la preparación
específica de spec10 y, únicamente tras spec/wireframes aprobados y autorización
separada, a su desarrollo. No autoriza desarrollo, cambios financieros ni merges.
No se modifica agent-project-template, Skills, hooks, scripts o workflows por este piloto.

Se reutilizan el paquete de [delegación](../../templates/agent-work-packet.md),
la QA independiente, los gates de [aprobación](approvals.md) y la entrada canónica
[de calidad](../guidelines/quality.md#entrada-compartida-v270--vigente).
No se crean formularios, Skills, workflows ni herramientas de medición paralelos.

- Preparación por sesión/cambio material de entorno: comprobar Git/PR/checkpoint,
  checkout y ownership escribibles, herramientas/versiones y prerrequisitos de la fase.
  Reutilizar entorno/dependencias válidos; instalar solo si faltan o cambia el lockfile.
  Comprobar permisos antes de asignar escrituras; un worktree existente no demuestra
  acceso. Nunca eludir sandbox, ampliar permisos por inferencia ni activar trust.
  macOS no acredita guardas Linux. En especificación no preparar toda la aplicación
  ni ejecutar suites funcionales sin necesidad documental o de CI.
- Un ejecutor por defecto. Delegar solo un resultado independiente que justifique
  el coste; usar el paquete existente con objetivo, fuentes, ownership, gates,
  comprobaciones y retorno breve. Preferir contexto nuevo y acotado cuando el runtime
  lo permita, sin omitir las instrucciones aplicables; no heredar toda la conversación
  por defecto. Devolver evidencia y extractos relevantes, no logs completos.
- Durante trabajo autorizado, comprobaciones focales por delta y una verificación
  canónica por candidato estable identificado por SHA/revisión. Reutilizar evidencia
  del mismo candidato/entorno; repetir por cambios, fallos o riesgos pendientes,
  anotando el motivo. La QA independiente revisa riesgos/casos negativos y ejecuta
  pruebas cuando aporten evidencia; no necesita duplicar toda batería ya acreditada.
  Esto no omite checks obligatorios, pruebas financieras ni full exigido por CI.
- Consultar CI inicialmente tras unos 60 s y espaciar después a 120–240 s si no cambia
  el estado; usar mientras tanto trabajo independiente autorizado o devolver estado
  pendiente. No mantener consultas/actualizaciones sin información nueva ni prometer
  supervisión después del turno. Ante fallo, analizar la evidencia antes de relanzar;
  mantener la distinción fallo/cancelación/cola y las aprobaciones por PR.
- Registrar métricas por hito en el tablero y, cuando existan, progress/testplan10:
  sesión/agente/modelo, intervalo, candidato, pruebas/resultado/motivo de repetición,
  bloqueo operativo con inicio/fin/causa conocida, y hallazgos QA/corrección.
  Usar JSONL e informes existentes, sin activar hooks ni publicar registros sensibles.
  Tokens: usage por respuesta, deduplicado por thread_id/response_id y agente propietario;
  caché incluida en entrada, contadores acumulativos excluidos, faltantes como N/D.
  Separar tiempo transcurrido, turnos y esperas; las atribuciones por actividad son
  estimaciones. No convertir tokens en cuota ni sumar tiempos de agentes paralelos.

Evaluar al aprobar spec10 (fase documental) y, si llega a autorizarse, al cerrar dev10
(fase funcional separada). Comparar resultados, rondas, contexto por respuesta, bloqueos,
repeticiones justificadas/evitables y hallazgos QA con la auditoría del 24/10 08:00–12:30.
Las tareas son diferentes: no atribuir causalidad ni mejora porcentual solo a totales.
Proponer conservar/ajustar/revertir el piloto; cualquier cambio a la plantilla se
planteará después con evidencia y autorización propias.


## Piloto operativo acotado — spec12 / E2.6

Autorizado el2026-10-24: usuario «te doy mi aprobacion para realizar esas mejoras y
seguir». Aplica a MyFinanzas y preparación documental de spec12; la fase funcional
requiere spec/wireframes aprobados y autorización de dev12. Reutiliza íntegramente
el piloto anterior y sus gates SDD/seguridad/QA. No cambia Agentic Template, Skills,
hooks, scripts ni workflows. No autoriza merge, Excel, despliegue o B3/Dev32.

1. **Preflight antes de delegar.** Verificar Git/PR/SHA/checkpoint, rama creada,
   ownership/conflictos y herramientas/permisos requeridos por la fase, reutilizando
   el entorno. Usar el paquete existente para asignar las operaciones potencialmente
   escaladas a un responsable. Comunicar anticipadamente operación, motivo y siguiente
   acción cuando el runtime lo permita: una llamada suspendida puede impedir avisar
   después. Si sus instrucciones exigen escalar directamente tras un fallo, respetar
   esa secuencia y explicar el bloqueo en justification, sin mensaje previo prohibido.
   No prometer aviso inmediato al coordinador si el runtime suspende la comunicación.
   El coordinador puede asumir navegador u otro paso delimitado; no duplicar una llamada
   activa, eludir sandbox/trust ni ejecutar operaciones privilegiadas de prueba.
2. **Supervisión por hitos.** Un ejecutor y QA independiente al candidato. Usar mensajes
   y esperas acotadas del runtime, sin prometer avisos de permisos que este no exponga.
   Un timeout no acredita fallo/progreso/aprobación. Consultar estado si resuelve una
   decisión o hay señal de bloqueo/control justificado; no encadenar dormir, releer
   estado y recordar sin información nueva. Mantener el espaciado CI del piloto previo.
3. **Contexto vigente.** Un resumen compacto en tablero: autorización/alcance, SHA
   integrado y candidato, PR, enlace a evidencia y próxima acción/gate. Actualizar por
   hito y conservar historia debajo sin copiarla otra vez. Reanudar verificando deltas
   Git/PR y leyendo solo fuentes necesarias o modificadas. Progreso/testplan son dueños
   del detalle. Registrar CI final primero en la PR y consolidarla con el siguiente
   cambio documental autorizado, evitando otro full solo por su resultado; señalar
   cualquier retraso documental y cerrar el resumen tras verificar el merge.
4. **Cobertura y plataforma antes del código.** En el testplan existente: AC aprobado →
   caso positivo/negativo y riesgo/integración → comando → entorno → evidencia esperada.
   Diseñar según alcance producción sin demo, concurrencia, restauración y respuestas
   asíncronas; en especificación no son PASS funcional. Distinguir focales/baseline/
   tipos/build/navegador locales soportados de guardas Linux/glibc. No intentar full
   Linux en macOS con prerrequisitos conocidos ausentes. No es un modo parcial verde
   ni excepción docs: resultado global exige CI Linux completa en el SHA candidato.
   Repetir por cambio/fallo/riesgo registrado; QA revisa candidato/delta sin duplicación
   automática de una batería ya acreditada.

**Medición y evaluación.** Usar JSONL/lector existentes y progress/testplan, sin nuevos
medidores ni activar hooks/trust. Separar especificación, desarrollo y aprobaciones/
merge; documentar compactaciones, alcance y entorno. Mantener deduplicación, caché
incluida, faltantes N/D y límites de atribución del piloto anterior. Registrar tiempo
por turno y bloqueo (inicio/fin/causa/demora observable de aviso, sin sumar solapamientos),
tokens/respuestas por agente/modelo, intervenciones/consultas y su información o decisión,
verificaciones por candidato/entorno/motivo de repetición, cobertura inicial y hallazgos
QA/fallos CI. Sin convertir tokens en cuota ni herramientas en CPU/espera humana pura.

Referencia funcional Dev10:64,4min,78 respuestas del coordinador,26.024.501 entrada
coordinador/31.634.695 equipo,16 reanudaciones espera/consulta. Dev11:51,2min,144respuestas,
19.320.047/28.778.061 entrada,37reanudaciones. Excluye aprobación/merge posterior y
la auditoría; entrada incluye caché. La compactación previa y alcances distintos
impiden atribución causal. Comparar fase documental con spec10/spec11 documental.
Éxito preliminar: bloqueos comunicados por el canal permitido antes de la suspensión,
AC mapeados al inicio,
plataforma correcta, repeticiones justificadas y menos consultas sin información nueva,
sin perder cobertura/QA/controles. Sin porcentajes prometidos ni máximo de pruebas ajeno
al riesgo. Evaluar conservar/ajustar/revertir al cierre; traslado reutilizable a la
plantilla requiere evidencia y autorización propias.
