---
name: codex-review
description: Pide a Codex CLI una revisión externa de solo lectura de un candidato, sin sustituir la QA independiente.
---

# /codex-review — Claude Code adapter

Lee y sigue la Skill canónica `.agents/skills/codex-review/SKILL.md`; este wrapper no añade reglas.
Argumentos: `$ARGUMENTS`. Un comando no concede aprobación ni cambio de modelo por sí solo; la
autorización permanente y sus límites están en
[dynamic-agents.md](../../../specs/methodology/dynamic-agents.md#standing-authorization-codex-cli-as-read-only-external-reviewer).
Aprobaciones: [approvals.md](../../../specs/methodology/approvals.md).
