@AGENTS.md

# MyFinanzas · Claude Code adapter (adopción v2.4.2)

Las decisiones financieras, arquitectura, roadmap, permisos y estado del proyecto
se mantienen en los documentos canónicos del repositorio. Este adaptador NO
sustituye ni reinterpreta `AGENTS.md` ni las Skills existentes.

- Verificar al inicio `AGENTS.md`, las normas locales en
  `specs/methodology/myfinanzas-coordination.md`, Git/GitHub y el checkpoint relevante.
  Consultar `specs/project.md`, `specs/setup-progress.md`, `specs/epic-board.md`
  y especificaciones aprobadas según la tarea, su riesgo y las decisiones necesarias.
  El tablero es reanudable, no prueba autónoma de autorización ni verdad de CI.
- Invocar `/orchestrate` en Claude Code; su contrato canónico sigue siendo
  `.agents/skills/orchestrate/SKILL.md`. Los otros comandos `/spec`, `/dev`,
  etc. delegan en las Skills equivalentes existentes.
- En MyFinanzas la aprobación de especificación NO autoriza desarrollo:
  exige autorización de alcance adicional conforme a reglas locales.
- Para decisiones protegidas exigir aprobación afirmativa e individual que
  identifique la operación: por ejemplo «Apruebo PR #N» o «Apruebo
  especificación 07». «Dale», «ok», «continúa» o «adelante» solo permiten
  continuar trabajo YA autorizado y nunca autorizar un merge, un cambio
  financiero, una nueva especificación, un despliegue o una migración real.
  Si existe `specs/methodology/approvals.md`, leer además esa política.
- No implementar E2.1, desplegar, modificar datos financieros reales ni
  reactivar infraestructura en pausa por el mero cambio de herramienta.
- Los perfiles `.claude/agents/` son contratos reutilizables, no trabajadores
  permanentes. Solo delegar con packet y herramientas reales verificadas.
- No inventar conocimiento de chats Codex, worktrees no publicados, CI, hooks,
  herramientas, permisos, costes o evaluaciones que no se hayan verificado.

Para puesta en marcha segura: `docs/CLAUDE_CODE.md`.
