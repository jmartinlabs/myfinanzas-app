---
name: work-issue
description: Take authorized work from Issues and an optional GitHub Project inside its phase gate.
---

# /work-issue — Claude Code adapter

Read and follow the canonical Skill `.agents/skills/work-issue/SKILL.md`; the only addition
is the Claude note below. Arguments: `$ARGUMENTS`. Codex `$name` maps to `/name` here; a
slash command grants no approval, model change or delegation by itself.

`/work-issue opencode` names the queue, not a parallel worker: one Claude session works that
agent's eligible Issues until the queue is empty, using `scripts/work-issue` for the mechanical
steps only. Approvals still come from the issue workflow, and merge keeps its own gate.

In Claude Code the agent identity is always `claude`: pass `--agent claude` to every
`scripts/work-issue` call, including when `/work-issue` has no argument. With no argument the
queue is the Issues without an agent label plus those labelled `agent:claude`; other agents'
Issues are reported, never taken. Never reserve under another agent's name.
