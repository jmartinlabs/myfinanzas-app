---
name: work-issue
description: Take authorized work from Issues and an optional GitHub Project inside its phase gate.
---

# /work-issue — Claude Code adapter

Read and follow the canonical Skill `.agents/skills/work-issue/SKILL.md`; the only addition
is the Claude note below. Arguments: `$ARGUMENTS`. Codex `$name` maps to `/name` here; a
slash command grants no approval, model change or delegation by itself.

In Claude Code the agent identity is always `claude`: pass `--agent claude` to every
`scripts/work-issue` call that takes or moves an Issue, including when `/work-issue` has no
argument. The queue is the Issues without an agent label plus those labelled `agent:claude`;
other agents' Issues are reported, never taken. The tool uses `--agent` both to filter the queue
and to sign the reservation, so Claude does not work another agent's queue: `/work-issue opencode`
(or any agent other than `claude`) is rejected with that explanation, and `next --agent opencode`
is allowed only as a read-only look. Approvals still come from the issue workflow and merge keeps
its own gate. Never reserve under another agent's name.
