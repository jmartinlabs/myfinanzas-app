# MyFinanzas — coordinación y precedencia local

Contrato adaptado de agent-project-template v2.3.1. Fuente y diferencias:
[adopción](orchestration-adoption.md). No cambia el stack ni las ocho etapas cerradas.

## Autoridad y entradas
1. Instrucciones y autorizaciones expresas del usuario; política Git/GitHub de AGENTS.md.
2. Roadmap, especificaciones y decisiones aprobadas como fuentes canónicas. Referencia
   financiera única v5.11(7), candidata NO estable; jamás inventar reglas económicas.
3. Contratos de coordinación de esta carpeta y perfiles reutilizables. El tablero es
   un índice reanudable, no evidencia de aprobación por sí solo. Reconciliarlo siempre.

$orchestrate usa Quick/Standard/Full por riesgo sin volver a inicializar el proyecto.
E1.6 conserva su Full/spec06 aprobada; no otra ronda Q1–Q4 ni documentos redundantes.
La adopción tiene alcance expresamente autorizado y no exige repetir su aprobación
para inspeccionar/copiar componentes. La PR resultante sí exige autorización de merge.
No cambiar el modelo: la sugerencia de capacidad/razonamiento es orientativa, no un
selector real ni otro gate. Conservar el modelo actual si es suficiente.

## Gates que NO desaparecen
- Especificación aprobada + dependencias satisfechas + autorización expresa de
  desarrollo de esa entrega: solo entonces dev puede pasar a ready. No basta que
  una PR de especificación sea MERGED. No hace falta volver a escribir $dev si ese
  alcance ya fue autorizado en la ejecución activa.
- Esta intervención solo cierra PR24 y propone adopción metodológica. No dev06 ni
  spec07, ni cambios financieros/SQL/migraciones, ni nuevas investigaciones técnicas.
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
La heurística 1–3 no es techo: comprobar las herramientas y límites de la sesión antes
de ampliar. No inferirlos de Agents API ni del nombre Desktop/Web. No delegación recursiva
salvo alcance y autorización explícitos del coordinador dentro del permiso del usuario.
No duplicar tareas activas. Leer listado de agentes reales y checkpoints antes de asignar.

Cada paquete usa templates/agent-work-packet.md, con gate, dependencias, ownership,
aislamiento, prohibiciones, revisión exacta y formato de retorno. Roles funcional,
implementación, QA y infraestructura son perfiles; no procesos residentes.
- Lecturas concurrentes pueden compartir el checkout. En esta validación solo el
  coordinador escribe: todos los paquetes delegados tienen write=[] y no ramas nuevas.
- Código concurrente: ownership disjunto Y aislamiento de checkout autorizado. No
  crear worktrees sin petición explícita; una rama por sí sola no aísla el directorio
  compartido. Si no hay aislamiento, serializar escrituras sin bloquear análisis de lectura.
- QA independiente del autor de implementación; tests reales solo cuando exista candidato.
  Diseño de pruebas no es PASS; revisión de un contrato futuro no lo implementa.
- Sin herramientas multiagente: misma cola y gates en secuencia, sin delegación fingida.
- Verificar después de cada resultado/cambio de aprobación: fuentes, Git, diff, checks
  y siguiente tarea realmente autorizada. Si no queda trabajo autorizado, guardar estado
  y detenerse; no abrir infraestructura para mantener ocupado el pool.

## Chats existentes y reanudación
Chats financieros/infraestructura externos no son nuestros subagentes y no podemos
controlarlos, cerrarlos ni asumir su contexto. Antes de transferir trabajo, incorporar
checkpoint de cada dueño: objetivo/alcance autorizado, rama/SHA/PR, cambios sin commit,
decisiones, comandos/resultados, bloqueos y próximo paso. Verificar Git sin sobrescribir.
Mientras no haya checkpoint, marcar externo/no verificado; no reasignar ni duplicar.
Reanudar leyendo AGENTS, este contrato, tablero, specs/progress/testplan y Git/PR actuales.
No prometer actividad después del turno ni agentes trabajando entre sesiones.
