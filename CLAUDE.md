@AGENTS.md

# MyFinanzas · Claude Code entrypoint

Este archivo es un punto de entrada ligero para Claude Code. Las decisiones financieras,
arquitectura, roadmap, permisos y estado del proyecto viven en el repositorio; el núcleo
común (skills, roles, plantillas y metodología base) proviene del plugin global
`agentic-harness-plugin`.

- Lee al inicio `AGENTS.md`, `specs/project-rules.md`,
  `specs/methodology/myfinanzas-coordination.md` y el estado nativo de las Issues en Git/GitHub
  (Project #4 es histórico).
- Las reglas de aprobación viven en `specs/methodology/approvals.md` y `specs/project-rules.md`.
  `.claude/settings.json` solo añade confirmaciones `ask` en Claude Code; no concede ni
  sustituye aprobaciones.
- En MyFinanzas la aprobación de especificación **no** autoriza desarrollo y el permiso de
  push **no** autoriza merge.
- No reactives Dev32/PR30, VPS, despliegues ni datos financieros reales sin autorización
  específica.

Para puesta en marcha segura: `docs/CLAUDE_CODE.md`.
