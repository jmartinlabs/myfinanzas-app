# orchestrate — on-demand reference

Read the part you need when the [orchestrate core](SKILL.md) points here (delegating, choosing a
runtime, closing a delivery, advisor review, status and communication). It is policy, not optional
advice: the full text of what the core summarizes, kept out of the core to cut the tokens loaded on
every invocation.

## 6. Delegation
Follow specs/methodology/dynamic-agents.md: prefer a specialist for substantial, autonomous work — specification drafting, approved implementation, investigations and QA — and reserve direct execution for small corrections, coordination, user decisions and operations where delegation does not pay. Keep a single executor per task and delegate a complete verifiable outcome rather than microsteps. Choose the execution mode adaptively — direct, foreground or background — under the mode rules there: background only with verified client support and real benefit; prefer it when the coordinator can advance independent authorized work. Announce task and ID, executor, mode, isolation and coordinator availability when substantial work starts. Add concurrent tasks only where independent work justifies extra coordination and context; never invent agents or work. Preserve mandatory independent QA after the candidate. Packets document approved scope, ownership, applicable rules, checks, stop condition and return evidence. Carry the role as the dispatch handle: `option: implementation|functional|review|qa|infrastructure` in Hermes when the profile declares named `model_map` options, or only as the role contract in clients whose models the user configures manually; never generate per-role agents from the repository. The coordinator keeps the model the user chose in the client. Use fresh bounded context, scope-sized preflight and operation owners; follow the same contract for external clients, never assume messaging or stop control. For Agent Relay clients use stable task/session identity and require a complete `HANDOFF → CODEX` on every follow-up, including blockers and decisions, per [coordinator communication](../../../specs/methodology/coordinator-communication.md).

## 7. Runtime
Apply the quota dispatch gate in specs/methodology/model-selection.md before new Codex tasks, including QA. Record external availability per execution; reuse the existing packet for Agent Relay v1. Keep the coordinator model when adequate; portable tier advice never overrides the quota gate. For a justified risk, an optional read-only Codex review (launched on its own only by a Claude Code coordinator) follows [codex-review](../codex-review/SKILL.md); it never replaces independent QA. Launch subagents only with actual runtime support and measurable benefit, otherwise execute sequentially. Releasing the turn for a background subagent does not end its runtime; closing the client or runtime may. Never invent worker lifecycle or token telemetry. Verify quotas, isolation and ownership. Supervise at outcomes/blockers/decisions using bounded event waits and progressively spaced CI queries; no reminders or repeated reads without new evidence.

## 10. Verify and hand off
Verify actual acceptance checks, financial/security regressions and diff; report PASS/FAIL/UNRUN distinctly. Record concise checkpoints at changed approval/candidate/QA/blocker/PR milestones; keep actual Git SHA and next safe action. External chats cannot be controlled by this coordinator. No agents continue after the active session ends. Update one current summary with candidate, check/QA evidence, PR/merge state and next action; replace stale labels and link historical entries. Post-merge worktree cleanup follows the core rule; after restoring a handoff, retire its temporary checkpoint only under [checkpoint retirement](../handoff/SKILL.md#next-session-and-checkpoint-retirement). Preserve dirty, unknown or other-task resources.

## Independent advisor review before delivery

A Specification, or an analysis that fixes a financial contract, a data-integrity
guarantee, a migration plan or an architectural boundary, is not delivered for approval
until a **critical review by a role that did not author the proposal** has been applied.
Use the `advisor` role when the client exposes one; otherwise any competent independent
reviewer with the same mandate. It advises: it never approves, authorizes or substitutes
the user's decision.

Reviewer mandate — it must actively try to break the proposal, not confirm it:

- contrast it with the functional decisions the user already approved;
- find contradictions between Issues, owner specs and consumers, including a consumer
  classified with the wrong semantics or a criterion that lives in two Issues;
- check financial calculations, edge cases and historical integrity: closures, exercised
  borders, shared expenses, idempotency, concurrency, reversals;
- challenge unnecessary complexity and propose the simplest design that keeps every
  guarantee — extra tables, states, stages and criteria are presumptive defects;
- assess migration, rollback, recovery and compatibility risk, including what breaks
  backups or restores that must keep working.

The delivery carries a short review summary: what was reviewed, which problems it raised
and how each was resolved. Any **material disagreement** remaining between coordinator
and reviewer is presented explicitly with its evidence, never smoothed over; the user
decides. Claims about what the reviewer found keep the usual labelling (DEMOSTRADO,
DOCUMENTADO, UNRUN).

Do not apply the gate to trivial work, do not repeat the review when nothing material
changed, and never let it absorb the independent QA required after implementation — that
one runs on the candidate, with its own evidence.

## Resource efficiency and deliberate shutdown
- Coordinate results, not messages; never repeatedly ingest unchanged large documents or recreate a packet for already-owned work.
- Investigations need a falsifiable hypothesis and bounded probe. After two comparable attempts with no new evidence, record the blocker and request a different hypothesis or explicit scope decision; never claim failed tests passed or omit required safety containment.
- On quota exhaustion or a user stop request, use [$handoff](../handoff/SKILL.md) rather than auto-resume, provided the runtime can execute it. Preserve safe state, control only real workers, and distinguish unknown checks.
- Report token usage only from actual runtime telemetry; resource saving never overrides QA, financial protections, approvals or the separate dev gate.

## Communication and status
- Apply [coordinator communication](../../../specs/methodology/coordinator-communication.md) to Agent Relay v1 delegation, returns, corrections and status. Preserve Task ID and functional session reference; never invent a technical session ID.
- Every correction/query repeats the complete-return instruction; include the actual needed decision or content, not an absent attachment. Received reports are not verified results.
- State whether the user must trigger an Agent Relay read/response and the exact human next action. Attribute each return only to its identified task/session; ask if ambiguous.
- Use the existing current summary and milestone events. No per-message Git/worker polling, document writes or second board. A full-state request is read-only; show provenance, recorded candidate, blockers, gates and next action for every open task, declaring what was not refreshed.
- When work/actions remain, end with 2–4 compact status lines, using relay states from the communication contract. A delivered packet stays PENDIENTE until the user confirms publication; native agents retain runtime states only.
- Every final or stopped reply states the responsible party, the exact human action (or "ninguna"), and the state plus reason for waiting. "Continúo" is followed by execution, never by another closing promise. Apply the [closure contract](../../../specs/methodology/coordinator-communication.md) rather than repeating it here.
- No received handoff grants merge, scope or resumption authorization. Keep all MyFinanzas financial, independent-QA, model/quota and separate development gates.
