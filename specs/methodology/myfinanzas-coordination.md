# MyFinanzas — coordinación y precedencia local

Contrato local adaptado de agent-project-template v2.3.1, con coordinación ligera v2.4.1 y Skill `$handoff`. Fuente y diferencias:
[adopción](orchestration-adoption.md). No cambia el stack ni las ocho etapas cerradas.

## Autoridad y entradas
1. Instrucciones y autorizaciones expresas del usuario; política Git/GitHub de AGENTS.md.
2. Roadmap, especificaciones y decisiones aprobadas como fuentes canónicas. Referencia
   financiera única v5.11(7), candidata NO estable; jamás inventar reglas económicas.
3. Contratos de coordinación de esta carpeta y perfiles reutilizables. El tablero es
   un índice reanudable, no evidencia de aprobación por sí solo. Reconciliarlo siempre.

$orchestrate usa Quick/Standard/Full por riesgo sin volver a inicializar el proyecto.
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
- Mantener aprobaciones expresas para finanzas, especificaciones, nuevo alcance,
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
