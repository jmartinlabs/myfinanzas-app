---
name: handoff
description: Stop and consolidate this session without continuing development.
---

# /handoff — Claude Code adapter

**Canonical workflow:** `.agents/skills/handoff/SKILL.md`.
Read that exact file and follow its shutdown rules. Also respect `AGENTS.md`, `CLAUDE.md` and `specs/methodology/myfinanzas-coordination.md` for MyFinanzas-specific gates.

Requested scope or arguments: `$ARGUMENTS`.

This command is the Claude Code equivalent of Codex `$handoff`, not a new approval or an automatic pause/resume hook. Use only actual Claude runtime capabilities to request cancellation of owned subagents. Do not assert worker termination without confirmation; other sessions remain outside its control. Preserve uncommitted work and report failures honestly.
