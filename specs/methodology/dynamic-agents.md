# Dynamic agent management (v2.3.1)

> MyFinanzas: [project coordination and authorization gates](myfinanzas-coordination.md)
> override generic examples. Spec approval alone never starts dev06/spec07 here;
> development needs explicit scope authorization. Examples are not repository status.

This document defines how `$orchestrate` chooses **how many specialist tasks to delegate**, creates work packets, supervises them, and closes them. Read with [epic orchestration](epic-orchestration.md), [model selection](model-selection.md) and the [visual operating guide](../../docs/GUIA_VISUAL_ORQUESTACION.md).

## Roles are profiles, not permanent workers

Available reusable task profiles: [Functional](../../.agents/roles/functional.md), [Implementation](../../.agents/roles/implementation.md), [QA/Review](../../.agents/roles/qa-review.md) and [Infrastructure/DevOps](../../.agents/roles/infrastructure.md). They constrain behavior, but **do not register four running agents** or limit delegation to four instances. The coordinator may assign multiple independent tasks of the same profile or write a temporary, narrowly specified task role (for example, database investigation) using the same rules.

The coordinator is the only scheduler and shared board writer. Subagents must not spawn further agents unless explicitly authorized by the coordinator in a supported runtime; avoid recursive uncontrolled delegation.

## Dynamic selection algorithm

1. **Inventory** the ready queue using the board, authoritative approvals, dependencies and current source/test evidence. Classify work as read-only research, document draft, code edit, QA, or infrastructure; identify required skill/profile and affected files.
2. **Check necessity**: Delegate only bounded independent work that can progress without blocked prerequisites or additional user decision. Simple, dependent or short tasks should stay with the coordinator.
3. **Size the pool** according to independent ready work, risk, coordination overhead, file contention and estimated usage. Usually start with **one to three active specialists**; add a fourth or more only if a clear benefit outweighs overhead and the actual environment permits it. This is a **methodology recommendation**, not a universal technical Codex limit. Respect any runtime concurrency cap, quotas and limits. Do not require permission for each ordinary subagent within a confirmed scope, but do request approval for additional unapproved scope, expense/operations with impact, or destructive actions.
4. **Pick a role dynamically** from reusable profiles or a temporary narrowly bounded specialization. Same profile can be used more than once for independent tasks. For each delegate, issue a [work-packet contract](../../templates/agent-work-packet.md): unique ID, source/approval evidence, objective, file ownership, read/write permissions, isolation, dependencies, deliverable, checks, prohibitions and return schema.
5. **Start only if supported**: Check actual available subagent tools/capabilities in this Codex session before claiming a worker exists. If unavailable, use sequential execution following the same ready queue; never pretend the delegate ran. External chats opened manually are **not** attached workers. They can only contribute via recorded checkpoints/branches/PRs.
6. **Supervise**: Track assigned, running, awaiting-result, blocked, completed or cancelled; inspect results and actual diffs/tests; update the shared board after each event. Do not spawn duplicates for the same scope or let two workers write the same files. Parallel read-only tasks can share one checkout; separate code writers need non-overlapping file ownership and permitted isolated checkouts/branches, otherwise serialize writes.
7. **Close or reassign** when deliverables are complete, blocked, duplicated or no longer useful. A completed agent's task is done; launch a **new bounded work packet** for another need rather than treating a role as a permanent always-on worker. Do not claim terminated sessions kept working or that agent cleanup was executed unless the runtime confirms it.

## Prioritization and approvals

- A blocked financial specification blocks **only its own implementation**; independent specifications, investigation and provisional QA can progress.
- Explicit approval gates remain for financial/accounting choices, security/architecture changes, approved Full specs, destructive actions, PR merges and production deployments. Merely creating a delegate cannot bypass them.
- A coordinator can choose specialization and model capability guidance per work packet without automatically switching models or claiming model-specific parallelism.
- Infrastructure work has its own queue; a SQLite research task cannot starve functional preparation unless its result is a documented hard prerequisite.

## Capability boundaries

This repository contains **instructions and templates**, not executable subagent registration, an always-on scheduler or a CI-managed job queue. In Codex Desktop/Web, confirm the client actually offers delegation and isolation before using it. The [OpenAI Agents API multi-agent guide](https://developers.openai.com/api/docs/guides/agents-api/multi-agent) documents a separately configured API runtime; its default concurrency or tools **must not be assumed for a Codex UI session**. No background operation is promised after the active execution ends.

## Result contract for each work packet

Return: packet ID; completed/blocked status; changed and read files; commit/revision if applicable; real tests and results (passed/failed/unrun); unresolved decisions, file collisions or blockers; evidence links; next independent action. The coordinator reconciles the board and decides whether to launch a new packet. No delegate may self-approve decisions, merge PRs or change the board.

## Example: two ongoing MyFinanzas chats

1. Request checkpoint from Financial and Deployment chats (scope, branch/commit, decisions, tests, blockers); do not abandon unstaged changes.
2. Reconcile both checkpoints in a new `$orchestrate` active session, with a fresh authoritative scan of repo state.
3. Finish/migrate work in those chats deliberately; **do not pretend the coordinator can message or terminate the existing chats**.
4. With verified delegation, create fresh task-limited Financial, Infrastructure, Functional and QA subagents as ready work requires; otherwise execute sequentially.
5. User remains the approver for consequential financial decisions, Full specifications, merges and production deployment.

See the [illustrated migration steps](../../docs/GUIA_VISUAL_ORQUESTACION.md#7-migrar-dos-chats-existentes-a-un-coordinador) for a graphical walkthrough.
