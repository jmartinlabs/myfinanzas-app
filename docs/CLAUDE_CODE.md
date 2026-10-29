# MyFinanzas · Uso con Claude Code (adapter de agent-project-template v2.4)

## Qué se conserva y qué cambia

Codex y Claude Code comparten el **mismo repositorio** y las mismas
decisiones: `AGENTS.md`, `specs/project.md`, especificaciones aprobadas,
roadmap, `specs/epic-board.md`, `.agents/skills/` y `.agents/roles/`.
Claude utiliza `CLAUDE.md`, `.claude/skills/` y `.claude/agents/` como
adaptadores. No duplicar reglas financieras ni mantener dos tableros.

El historial de conversaciones, permisos de sesión, subagentes vivos y cambios
sin commit/push en worktrees de Codex **no se transfieren automáticamente**.
Reconciliar PRs, main y checkpoints antes de asignar trabajo. Una PR abierta
no es documentación integrada. No inferir aprobaciones de textos escritos
por agentes ni de un tablero que aún cite SHAs anteriores.

## Primer uso seguro (solo lectura)

1. Abre el checkout de `myfinanzas-app` con Claude Code y confirma que lee
   `CLAUDE.md` y `AGENTS.md`. Comprueba la disponibilidad real de los
   comandos `/orchestrate`, `/spec` y `/dev`.
2. Ejecuta `/orchestrate` con el encargo:
   «Inspecciona main, PRs, specs, roadmap y tablero; reconcilia estado,
   aprobaciones y dependencias. Solo lectura: no desarrolles, fusiones,
   despliegues ni modifiques datos. Propón el siguiente trabajo autorizado».
3. Comprueba que distingue estados integrados, PRs abiertos, borradores no
   publicados, especificaciones aprobadas y autorizaciones de desarrollo.
   En particular, no ejecutar E2.1 ni Dev32 sin permiso separado.
4. Si se necesitan subagentes, verificar que el cliente real soporta
   delegación y que los packets poseen ownership y aislamiento seguro.
5. Registrar modelo, versión de Claude Code, fecha, observaciones, pruebas
   realmente ejecutadas y limitaciones. No declarar compatibilidad
   probada solo por la existencia de archivos.

## Aprobaciones y costes

Las reglas de aprobación (por ejemplo `Apruebo PR #N` y qué no vale como
aprobación) están solo en `specs/methodology/approvals.md`. Priorizar trabajo
autorizado y no duplicar QA ni subagentes innecesariamente.

Este adaptador no activa Claude, no contrata ninguna suscripción, no instala
hooks ni configura claves de API, no ejecuta Evals de modelos y no despliega.
El evaluador multiplataforma se mantiene en
[agent-project-template](https://github.com/jmartinlabs/agent-project-template/tree/main/evals).
Ejecutar pruebas de comportamiento sobre un agente real antes de comparar
su cumplimiento con Codex.
