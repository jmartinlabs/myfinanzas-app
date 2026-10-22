---
name: handoff
description: Stop and consolidate this session without continuing development.
---

# /handoff — Claude Code adapter

Lee y sigue la Skill canónica `.agents/skills/handoff/SKILL.md`; este wrapper no añade reglas salvo la nota Claude de abajo.
Argumentos: `$ARGUMENTS`. `$nombre` de Codex equivale aquí a `/nombre`; un comando no concede aprobación, cambio de modelo ni delegación por sí solo. Aprobaciones:
[approvals.md](../../../specs/methodology/approvals.md).

Usa solo capacidades reales de Claude para cancelar subagentes propios; no afirmes
que un trabajador se detuvo sin confirmación. Otras sesiones quedan fuera de su control.
Preserva el trabajo sin commit e informa de fallos con honestidad.
