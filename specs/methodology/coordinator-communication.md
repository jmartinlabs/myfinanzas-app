# Coordinator communication, returns and operational status

> Adaptación focal MyFinanzas desde agent-project-template v2.10.0 (tag anotado verificado), PR24, commit
> `f43d691d9ca9a0604044c97a1610f9e4daae822e`, sobre harness v2.9.0; revisada contra
> v2.14.0/`98b5351a72eae1df985819c01a47954e6a1a0836` para continuidad, publicación y cierre.
> [Precedencia local](myfinanzas-coordination.md), AGENTS y aprobaciones del usuario
> prevalecen; no cambia modelos/cuota, ownership, reglas financieras ni gates.

How the coordinator (Codex or Claude Code) talks to a manual external client such as OpenCode
and reports open work to the user. Read on demand from [orchestrate](../../.agents/skills/orchestrate/SKILL.md)
when delegating, receiving a return, or answering a status request.

This contract adds no service, hook, integration, polling or second source of truth. The
user relays every prompt and every return by hand. Canonical packet fields live in the
[work packet](../../templates/agent-work-packet.md); this file defines how they are used.

## 1. Identity

Every manual delegation, correction or query states:

- **Task ID** (unique, for example `ORCH-COMMS-01`) and its functional name;
- **Client:** OpenCode with its verified version, or `unverified`;
- **Session:** the technical ID only if it is known; otherwise the stable functional reference the
  user gave (for example `ORCH Comunicación`). Never invent an ID;
- **Repository, branch or worktree, objective and PR** (or `none`).

Corrections and follow-ups keep the same Task ID and session. Attribute feedback only by the Task ID
and session written in the return. If the origin is ambiguous, ask one short question **before**
changing any task state. Never attribute feedback to the last session by intuition.

## 2. Manual states

| State | Use when | It does not mean |
| --- | --- | --- |
| PENDIENTE DE ENVIAR | The prompt is prepared; the user has not confirmed sending it. | Work has started. |
| ESPERANDO RETORNO | The user confirmed sending it. | The client is running or will return. |
| RETORNO RECIBIDO | A return arrived and has not been verified. | The result is accepted. |
| EN REVISIÓN | The coordinator or QA has started verifying the candidate. | Verification passed. |
| CORRECCIÓN PENDIENTE | A correction message is prepared to send. | It was sent. |
| BLOQUEADO | A decision, authorization or impediment must be resolved first. | The whole project is blocked. |
| COMPLETADO | The result is verified against evidence and the task has no pending work. | Merge approval; that is a separate gate. |
| DESCONOCIDO | The evidence is insufficient to choose a state. | Failure. |

Rules:

- Delivering a prompt never proves execution. Only the user's confirmation moves a task to
  ESPERANDO RETORNO, and only a return moves it to RETORNO RECIBIDO.
- Only the coordinator marks COMPLETADO, after checking the return's candidate SHA, diff and checks.
  A return that says "validated" or "tests green" without evidence stays RETORNO RECIBIDO or DESCONOCIDO.
- Report external work completion and the later merge gate separately, for example
  `COMPLETADO · gate merge: pendiente de aprobación explícita`.
- Native subagents use only the states their runtime actually exposes. Do not add states they lack.
- Never show percentages or invented progress.

## 3. Initial delegation

Use the copyable variant of the [work packet](../../templates/agent-work-packet.md). It contains identity,
minimum context, objective, authorized scope, repository, isolation and ownership, files, restrictions,
authorizations, the available model or an unverified note, acceptance, tests, blockers and the
mandatory return block. Write the copyable text in the user's language, keeping the heading and field names.

## 4. Mandatory return

Every delegation requires exactly one final, clearly delimited, copyable block headed
`HANDOFF → CODEX` (or the coordinator's client name, see section 10). The client must return it
also when it is blocked or needs a decision. Its fields are defined in the packet template:
task and origin session, status COMPLETED / PARTIAL / BLOCKED / CANCELLED, summary and changes,
relevant files and pending changes, branch / SHA / PR (or absent or unknown), tests PASS / FAIL / UNRUN
with command, environment, candidate and evidence, risks and blockers, decisions needed, and the
recommended next action.

Never declare PASS without evidence. If a reported result lacks its command, environment,
candidate or evidence, label it externally reported and unverified; request only the missing
information. FAIL means an observed failing check; UNRUN means the check was not executed.
Missing evidence alone proves neither failure nor non-execution.

## 5. Corrections, queries and follow-ups

A correction or query repeats the return instruction. It does **not** repeat the original packet
while its context stays valid. Use this shape, in the user's language:

```text
Destination: OpenCode · Task ID and name: <ID and functional name> · Session: <session reference>
Reason: <one line>
Requested change or information only:
- <item>
Do not change anything else. Keep the same scope and isolation.
When finished, return one complete HANDOFF → CODEX block: task/session, status/result, changes, candidate, tests/evidence, risks/blockers, decisions and next action; also if blocked or needing a decision.
```

## 6. Responding to a return

Each coordinator reply starts by naming the task and session and confirming receipt. Then it states
whether this is a **received report** or a **verified result**. Then:

- **a) Verified without corrections:** no message to the client is needed. Mark COMPLETADO only with evidence.
- **b) Corrections:** name the recipient session, Task ID, reason and copyable block (section 5).
  Mark CORRECCIÓN PENDIENTE until the user confirms sending, then ESPERANDO RETORNO.
- **c) Insufficient information:** send a minimal copyable query to the correct session, asking only
  for the missing items.
- **d) Review in progress:** state EN REVISIÓN and that nothing needs sending now.
- **e) External participation finished:** say whether the session should stay waiting or be closed by the user.
  Ask for final consolidation only if necessary information is missing.
- **f) Decision or authorization:** give the decision needed, its reason, the alternatives, the exact scope
  and the stopped work. Continue only the independent work already authorized. Mark BLOQUEADO only the affected task.

Every reply says explicitly whether the user must send something to OpenCode. Never leave that implicit.
Never call a received report "validated". Update only the matching task.

## 7. Closing a turn or stopping

Whether to yield the turn is defined in
[orchestrate execution continuity](../../.agents/skills/orchestrate/SKILL.md#execution-continuity).
This section defines only the communication contract for a final or stopped reply. An
intermediate report never closes the turn while executable authorized work remains.

Every final or stopped reply states, explicitly:

1. **Responsible party:** who must act (user, coordinator, external client or none).
2. **Exact human action:** the action, command or answer needed, naming the target. For a protected
   gate, give the exact approval wording expected.
3. **State and reason for waiting:** what remains blocked or pending and whether the agent waits.

Avoid ambiguous closings such as "next step: review the PR". Name who must review and what
they must decide. When no action is needed, say so and do not imply that a reply is required.
These rules apply to native and manual clients; manual relays keep their identity, copyable
messages and mandatory return. Reuse a valid authorization for corrections and checks in the
same scope; a correctable failed check is not a blocker.

## 8. Compact status (end of reply)

When open work or pending actions exist, end the reply with 2 to 4 lines:

```text
Estado · <Task ID> (<client>, <session>): <STATE> — <last known event>. Acción humana: <action or ninguna>. Responder a OpenCode: sí/no.
```

- Put blockers and human actions first; group the rest in one line (for example `Otros: 2 ESPERANDO RETORNO`).
- Omit the summary completely when there is no open work or pending action.
- Do not repeat completed history.
- Use the current summary and relevant events only. Do not query Git or workers, re-read histories,
  write files or Git, or create another board on each message.

## 9. Full status (read-only, on request)

When the user asks for the full state, orchestrate reports every open task from the existing sources
(progress, setup or board summary and open checkpoints). Reread the sources or check Git and PR state only
if the user asks for verification, or if the summary is stale or unknown. For each open task show:

- Task ID and functional name; client; session; state; and **provenance**: `verificado` (checked
  against Git or evidence), `comunicado externamente` (reported by the client or user, unverified) or `desconocido`;
- last result and its evidence (candidate SHA and checks);
- branch, worktree, SHA and PR as recorded, each with source and date;
- blockers, pending decisions and authorizations, hard dependencies;
- the next action of each executor, and the actions the user must take.

State what was not updated. This view writes nothing.

## 10. Several sessions and client portability

A return from session B updates only task B; tasks in sessions A and C keep their states. Every later
message keeps the Task ID and the destination session. The same rules serve Codex and Claude Code.
Only the client name changes: use `HANDOFF → CODEX` when Codex coordinates and `HANDOFF → CLAUDE CODE`
when Claude Code does. Manual relay remains the only route to OpenCode.

## 11. Gates and supervision

A received handoff never authorizes merge, deployment or a scope expansion. Those remain
protected actions under [approvals](approvals.md), which need an explicit, identifiable user approval.
Branch/PR publication inside the already authorized scope is ordinary work under the
[publication policy](approvals.md#publicación-de-rama-y-pr); it does not authorize merge and does
not end the task while checks or QA remain. Quota and model rules in
[dynamic agents](dynamic-agents.md) and [model selection](model-selection.md) do not change.
Supervise by events and milestones (returns, blockers, decisions); do not send repeated
status queries or reminders without new information.
