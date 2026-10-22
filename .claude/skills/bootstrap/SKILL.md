---
name: bootstrap
description: Prepara o revisa un esqueleto técnico únicamente dentro de un alcance autorizado.
---

# Claude Code · /bootstrap

Contrato canónico: `.agents/skills/bootstrap/SKILL.md`.
**Léelo íntegro antes de actuar** y ejecútalo para el alcance solicitado;
este archivo solo adapta la invocación a Claude Code.

Lee también `AGENTS.md`, `CLAUDE.md` y las normas específicas en
`specs/methodology/myfinanzas-coordination.md`. Si existe
`specs/methodology/approvals.md`, aplícala. Si hay contradicción o una
aprobación no verificable, no avances la acción protegida.

Alcance o argumentos del usuario: $ARGUMENTS

Traduce `$orchestrate`/otras Skills de Codex a `/orchestrate`/otras
Skills de Claude **solo como sintaxis**. No supongas que invocar un comando
activa Plan mode, cambia el modelo, concede permisos, despliega o crea
subagentes por sí solo. Comprueba capacidades reales y aislamiento.

Nunca conviertas «dale», «ok» o «continúa» en aprobación protegida.
No reinicies el proyecto ni reabras decisiones financieras aprobadas.
