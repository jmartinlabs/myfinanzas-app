# Dynamic agents — external clients

Load this document only when work involves a client other than the one coordinating (Agent Relay,
manual OpenCode, an external chat, Hermes or another worker outside this session). It completes
[dynamic agent management](dynamic-agents.md), which keeps every shared gate; nothing here relaxes
them. [Agent Relay v1](../../.agents/skills/relay/SKILL.md) is the canonical repository-local transport when
the user explicitly opens a conversation (`relay init`) and triggers each read (`Lee`); it is transport
only: never approval, state or a second source of truth, and no parallel relay or alternative relay branch
is maintained. Without repository access the user cannot use it: the coordinator executes or access is
resolved.

## Agent Relay v1 allocation

The user declares external availability for each execution; absent a declaration, OpenCode is not
enabled and no conversation is created. Do not launch or integrate it via CLI, MCP or APIs. When enabled,
publish the copyable content below through Agent Relay v1; the recipient reads it on `Lee` and returns
through the same conversation. Include a recommended model from that installation's verified catalog (otherwise mark it
unverified and request the catalog before assigning a model). Branch pushes and PR creation follow the
[publication policy](approvals.md#publicación-de-rama-y-pr); the packet grants none. Continue useful
independent authorized work, then wait; never repeatedly query the user or a worker for unchanged
status.

On return, independently inspect the actual diff, candidate SHA, acceptance evidence and CI, preferably
through independent QA. Request bounded corrections where needed; an external handoff cannot approve
itself or a merge.

## Workers in other clients

One coordinator owns scheduling and integration across Codex, Claude Code, OpenCode or other clients.
Verify actual client capabilities before relying on them; names prove none. External workers are not
controlled subagents merely because they share a repository: without a verified integration the user
relays packets and results and owns start/stop. Messaging another chat or service needs explicit user
authorization and supported tools; a worker asking to report back does not grant it. Never claim an
external worker stopped without confirmation; handoff names uncontrolled workers and asks their owner
to stop them. Never assume Claude hooks run elsewhere.

Concurrent writers need separate checkouts/worktrees AND non-overlapping ownership, and separate test
ports, databases and temporary directories where needed; serialize writes when safe isolation is
absent. Only the coordinator integrates reviewed results; workers cannot approve specs, merge or expand
their scope. Exchange compact results with reachable evidence (commit/diff or the existing progress or
test-plan section): no second board and no mandatory report per trivial task. Record usage from
attributed client telemetry only; the bundled reader accounts for Codex, so other-client usage is
unavailable unless collected separately, not zero. At closure update one current summary in the
project's single current-state surface (Project, else board, else progress document) and link it from
other documents instead of keeping competing statuses.

## Identity and manual states

Every manual delegation, correction or query states the **Task ID** (unique, with its functional name),
the **client** with its verified version (or `unverified`), the **session** (the technical ID only if
known, otherwise the stable reference the user gave; never invent one), and the repository, branch or
worktree, objective and PR (or `none`). Corrections keep the same Task ID and session; attribute
feedback only by the Task ID and session written in the return, and ask one short question before
changing any state if the origin is ambiguous.

| State | Use when | It does not mean |
| --- | --- | --- |
| PENDIENTE | A relay message (packet or correction) is prepared; the user has not confirmed its publication. | It was published or work has started. |
| ENVIADO | The user confirmed the recipient was told to read it; nothing has come back. | The client is running or will return. |
| RECIBIDO | A return arrived. It is a **claim**, not evidence. | The result is accepted or verified. |
| VERIFICADO | The return's candidate SHA, diff and checks were checked against evidence. | Merge approval; that is a separate gate. |
| BLOQUEADO | A decision, authorization or impediment must be resolved first. | The whole project is blocked. |

One state per task. Publishing a relay message never proves execution: only the user's confirmation moves a
task to ENVIADO and only a return moves it to RECIBIDO. Only the coordinator marks VERIFICADO, after
checking SHA, diff and checks; "validated" or "tests green" without evidence stays RECIBIDO. If the
evidence cannot decide, say `DESCONOCIDO` and name what would resolve it (an honesty escape hatch, not
a sixth state). Native subagents use only the states their runtime exposes. Never show percentages or
invented progress.

## Copyable packet content and mandatory return

Fill every placeholder before publishing the relay message, and include the applicable rules themselves:
local links alone are not enough if the worker cannot read them. Use the work packet as the single source of
scope and authorization. The return is headed `HANDOFF → CODEX` when Codex coordinates, `HANDOFF → CLAUDE CODE`
when Claude Code does and `HANDOFF → HERMES` when Hermes does.

```text
Task ID and name: <packet ID> — <functional name>
Session reference: <technical session ID if known; otherwise the stable functional reference>
Client: OpenCode <verified version or UNVERIFIED>; external, user-controlled start/stop; Agent Relay v1 conversation: <ID>.
Repository, branch or worktree, base SHA, PR: <verified values or absent/unknown; PR none unless the authorized scope includes publication>
Recommended model: <verified available model and rationale> | UNVERIFIED: catalog not checked; request it before assigning a model.
Objective and minimum context: <task, relevant decisions, source paths and instruction entry points>.
Authorized scope: <approval source/date, allowed actions, editable paths and exclusions>.
Ownership and restrictions: <files this task owns, files it must not touch, other active tasks>.
Shared test resources: <separate ports, databases and temporary directories, or not applicable>.
Applicable rules: <the task's required rules and source links; preserve approvals>.
Deliverable and acceptance: <concrete checks and expected behavior>.
Tests: <commands, environment, expected evidence; report PASS/FAIL/UNRUN with evidence>.
You execute this packet only. Do not use work-issue, claim or create Issues, write Project Status, start other workers, merge, deploy, self-approve QA or expand scope.
Blockers: stop and report on missing permissions, conflicting requirements, ownership collisions or scope expansion. Do not work around them.
Questions: do not ask the user directly or invoke the question tool; return them to the coordinator in the HANDOFF.
Implement, test and commit only when covered by the stated authorization; push and open or update a PR only when the authorized scope includes publication.
Return exactly one final copyable message, also when blocked, partial or needing a decision:
HANDOFF → CODEX
Task ID and origin session: ...
Final status (COMPLETED / PARTIAL / BLOCKED / CANCELLED): ...
Summary and changes: ...
Relevant files and pending changes: ...
Branch, commit SHA, PR (or absent / unknown): ...
Tests (PASS / FAIL / UNRUN for each command, with command, environment, candidate: SHA plus pending changes, and evidence): ...
Risks, blockers and open problems: ...
Decisions needed (or NONE): ...
Recommended next action: ...
END HANDOFF → CODEX
```

Every interaction (also a correction, blocker or decision) returns this full block, also when blocked. Never declare PASS without evidence: a
result lacking its command, environment, candidate or evidence is *externally reported and unverified*,
and you request only what is missing. FAIL means an observed failing check and UNRUN a check that was not
executed; missing evidence alone proves neither failure nor non-execution.

## Corrections and responding to a return

A correction or query repeats the return instruction, not the original packet, while its context stays
valid:

```text
Destination: OpenCode · Task ID and name: <ID and functional name> · Session: <session reference>
Reason: <one line>
Requested change or information only:
- <item>
Do not change anything else. Keep the same scope and isolation.
When finished, return one complete HANDOFF → CODEX block, also if blocked or needing a decision.
```

Each reply to a return names the task and session, confirms receipt and says whether it is a **received
report** or a **verified result**, then does one of: nothing more when verified with evidence; sends
corrections as a copyable block marked PENDIENTE until the user confirms (then ENVIADO); asks only for
the missing information while the task stays RECIBIDO (`recibido, verificando` while checking); says
whether the external session should wait or be closed; or states the decision needed, its reason, the
alternatives and the stopped work, marking only the affected task BLOQUEADO. Every reply says explicitly
whether the user must send something to OpenCode (`Responder a OpenCode: sí/no`, with `Tu acción:` when
yes). Name the responsible party, the exact human action (or `ninguna`) and the reason for waiting. A return from one session updates only that task; tasks in other sessions keep their states. A
received handoff never authorizes merge, deployment or a scope expansion, and the model and limit rules in the orchestrate core (steps 3–4) are
unchanged: supervise by events and milestones, not repeated status queries.

## Full status on request

When the user asks for the full state, report every open task read-only from the existing summary, board
or checkpoints: state with its provenance (verified against Git or evidence, externally reported, or
unknown), last result and its evidence, recorded branch/SHA/PR, blockers, pending decisions, the next
action of each executor and what the user must do (`Acción humana`), and say what was not updated.
Reread Git or PRs only if asked or if the summary is stale. Never append a status summary to every reply.

## Example: two ongoing MyFinanzas chats

1. Request a checkpoint from the Financial and Deployment chats (scope, branch/commit, decisions, tests, blockers); do not abandon unstaged changes.
2. Reconcile both in a new `$orchestrate` session with a fresh authoritative scan of the repository.
3. Finish or migrate work in those chats deliberately; **the coordinator cannot message or terminate them**.
4. With verified delegation, create fresh task-limited Financial, Infrastructure, Functional and QA subagents as ready work requires; otherwise work sequentially.
5. The user remains the approver for consequential financial decisions, Full specifications, merges and production deployment.

See the [illustrated migration steps](../../docs/GUIA_VISUAL_ORQUESTACION.md#7-migrar-dos-chats-existentes-a-un-coordinador).
