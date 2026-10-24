# MyFinanzas — coordinación y precedencia local

Contrato local adaptado incrementalmente de agent-project-template hasta v2.5.0 (tag `3c9aefe`), preservando coordinación ligera y Skill `$handoff`. Historia y procedencia:
[adopción](orchestration-adoption.md). No cambia el stack ni las ocho etapas cerradas.

## Autoridad y entradas
1. Instrucciones y autorizaciones expresas del usuario; política Git/GitHub de AGENTS.md.
2. Roadmap, especificaciones y decisiones aprobadas como fuentes canónicas. Referencia
   financiera única v5.11(7), candidata NO estable; jamás inventar reglas económicas.
3. Contratos de coordinación de esta carpeta y perfiles reutilizables. El tablero es
   un índice reanudable, no evidencia de aprobación por sí solo. Reconciliarlo siempre.

$orchestrate usa [Quick/Standard/Full por riesgo](workflows.md) sin volver a inicializar el proyecto; una petición Quick no autoriza decisiones financieras, desarrollo nuevo ni operaciones protegidas.
E1.6 conserva su Full/spec06 aprobada; no otra ronda Q1–Q4 ni documentos redundantes.
La metodología v2.3.1 está integrada mediante PR #32; sus reglas operativas
se aplican a entregas futuras sin reinterpretar las autorizaciones de negocio.
No cambiar el modelo: la sugerencia de capacidad/razonamiento es orientativa, no un
selector real ni otro gate. Conservar el modelo actual si es suficiente.

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
- Git: rama por ámbito, revisión de historial y datos sensibles, push/PR según política
  ya autorizada, squash merge únicamente tras aprobación expresa de esa PR y checks.

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
Las autorizaciones existentes no se amplían ni desaparecen por un handoff.

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
