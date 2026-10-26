# Dynamic agent management (v2.9.0, MyFinanzas adaptation)

> MyFinanzas: [project coordination and authorization gates](myfinanzas-coordination.md)
> override generic examples. Spec approval alone never starts dev06/spec07 here;
> development needs explicit scope authorization. Examples are not repository status.

This document defines how `$orchestrate` chooses **how many specialist tasks to delegate**, creates work packets, supervises them, and closes them. Read with [epic orchestration](epic-orchestration.md), [model selection](model-selection.md) and the [visual operating guide](../../docs/GUIA_VISUAL_ORQUESTACION.md).

## Roles are profiles, not permanent workers

Available reusable task profiles: [Functional](../../.agents/roles/functional.md), [Implementation](../../.agents/roles/implementation.md), [QA/Review](../../.agents/roles/qa-review.md) and [Infrastructure/DevOps](../../.agents/roles/infrastructure.md). They constrain behavior, but **do not register four running agents** or limit delegation to four instances. The coordinator may assign multiple independent tasks of the same profile or write a temporary, narrowly specified task role (for example, database investigation) using the same rules.

The coordinator is the only scheduler and shared board writer. Subagents must not spawn further agents unless explicitly authorized by the coordinator in a supported runtime; avoid recursive uncontrolled delegation.

## Dynamic selection algorithm

1. **Inventory** relevant ready work using checkpoint and real code/test/approval state. Do not rebuild the full queue after each event.
2. **Check necessity**: Default to one executor for an authorized outcome. Delegate complete deliverables, not microsteps; bring in independent QA at the candidate gate.
3. **Size the pool**: Prefer one executor, scaling only for independent ready tasks that justify context and coordination overhead. Respect actual runtime quotas and isolated ownership. This is not a fixed Codex limit or authorization for new financial scope.
4. **Pick a role dynamically** from reusable profiles or a temporary narrowly bounded specialization. Same profile can be used more than once for independent tasks. For each delegate, issue a [work-packet contract](../../templates/agent-work-packet.md): unique ID, source/approval evidence, objective, file ownership, read/write permissions, isolation, dependencies, deliverable, checks, prohibitions and return schema.
5. **Start only if supported**: Check actual available subagent tools/capabilities in this Codex session before claiming a worker exists. If unavailable, use sequential execution following the same ready queue; never pretend the delegate ran. External chats opened manually are **not** attached workers. They can only contribute via recorded checkpoints/branches/PRs.
6. **Supervise by milestone and exception**: Inspect actual candidate diff and test evidence at agreed handoffs, not each intermediate message. Prevent duplicate work; parallel code writers need disjoint ownership and safe isolated checkouts, otherwise serialize.
7. **Close or reassign** when deliverables are complete, blocked, duplicated or no longer useful. A completed agent's task is done; launch a **new bounded work packet** for another need rather than treating a role as a permanent always-on worker. Do not claim terminated sessions kept working or that agent cleanup was executed unless the runtime confirms it.

## Quota and dispatch gate
For Codex, query remaining subscription quota when a supported client tool exists:
execution start and before new assignments after meaningful milestones or quota warnings.
Reuse a recent reading within the same dispatch batch; no continuous polling, new service
or automatic paid consumption. Identify source and reading time. Prefer per-limit data;
compute remaining as `max(0, min(100, 100 - usedPercent))` for valid numeric values.
Use the minimum remaining across the five-hour (300 minutes) and weekly (10080 minutes)
windows. Missing/null/invalid values are unavailable, never zero or an invented percentage.
Partial data is incomplete: apply restrictions from known windows and disclose the gap;
unknown data never proves normal quota or blocks authorized work solely by assumption.
Token accounting in the usage reader is not subscription quota. Do not infer Codex quota
from Claude/OpenCode usage or assume this desktop tool exists in other clients.

- **More than 25% remaining:** normal allocation by complexity and quality: prioritize
  Codex for complex/critical work; consider enabled OpenCode for bounded verifiable work.
- **25% or less:** warn; no new Codex task or subagent, **including QA**, without explicit
  authorization for that identified task. General development approval is insufficient.
  Propose manual OpenCode only if enabled and suitable. Required QA stays pending until
  authorized or otherwise independently performed under the existing quality contract.
- **5% or less:** warn and stop initiating new tasks. Previous authorizations do not
  suffice: require a new explicit task authorization after this warning. Preserve state
  and existing advances at safe boundaries; do not destructively interrupt running work.
  Do not launch another Codex task merely to save a checkpoint; preserve it in the current
  session where possible. No automatic replacement workers or paid quota reset.

Record task-specific exceptions and their relation to the warning in the existing packet
or current summary. A warning is not approval; quota exceptions never waive QA or merges.

## Portable coordination v2.8.0

### Preparation and blocking operations
Before dispatch, perform a scope-sized preflight: checkout/revision and pending changes,
write ownership/access, required runtimes/dependencies, platform and test prerequisites.
Documentation work does not require provisioning an application or browser. Reuse a
valid prepared environment; repeat affected checks after checkout, lockfile, platform
or permission changes. Access checks do not grant authorization or predict every sandbox
restriction. Never broaden permissions or bypass client trust to make preflight pass.

Assign an operation owner for steps likely to need permissions (such as branch creation
or browser startup), plus a permitted notification route. When advance communication
is permitted, before requesting a potentially
suspending escalation, the worker notifies the coordinator of the operation, reason,
owner and next independent action. A suspended worker may be unable to notify afterward.
Advance notice is not another user approval gate: preserve native approval and protected
gates.
If higher-priority runtime instructions require a direct escalation retry without a prior user message,
respect that sequence and explain the blocking operation in justification. Never promise
a coordinator notification while the runtime has suspended communication. Without a
notification route, agree on manual relay or coordinator execution
before that operation. Report unexpected denials at the next controllable boundary;
pause only affected work. Never race another executor on the same resource.

### Context and supervision
Use fresh bounded context by default when supported. Supply objective, approval source,
relevant decisions, ownership, applicable rules and checks; link canonical sources.
Inherit full history only for a concrete dependency that cannot be supplied compactly,
recording the reason. Disclose runtime limitations; never omit safety rules to save tokens.
The coordinator also resumes from the current summary and relevant deltas at delivery
boundaries, rather than preloading completed deliveries. Do not force compaction or
create another chat automatically; retain access to canonical decisions and approvals.

Coordinate by outcome, blocker or decision, not repeated status reminders. Prefer bounded
runtime completion/event waits within client limits. A timeout without new evidence is
not a reason to reread unchanged files or wake a worker. Space CI queries progressively
while status is unchanged; reset after a meaningful transition or failure. During waits,
advance independent authorized work or return pending state. Do not add a polling agent
or service, promise monitoring between turns, or delay attention to new user input.

Use focal checks during development and complete required verification for each stable
candidate at its gate. Evidence identifies commit plus dirty/untracked changes, command,
environment and result. After a delta, repeat affected checks; full verification remains
required for uncertain impact, mandatory gates or financial/security risk. QA independently
inspects the candidate and evidence, runs checks that resolve risks and records reasons
for repeats; it does not merely accept the author's summary. Consolidate findings into
a bounded correction packet, then review the delta.

## Manual OpenCode allocation
The user declares external availability for each execution; absent a declaration,
OpenCode is not enabled. Do not launch or integrate it via CLI, MCP or APIs. When enabled,
use the copyable variant of the existing work packet, including a recommended model from
that installation's verified available catalog (otherwise mark recommendation unverified
and request the catalog before assigning a model). The user copies the prompt and returns
`HANDOFF → CODEX` manually. Stable task/session identity, manual states, corrections and mandatory full returns in every interaction follow [coordinator communication](coordinator-communication.md). Commits and PR preparation are permitted only within existing
project authorization; the packet grants none. Notify significant assignments, models,
blockers and deliveries. Continue useful independent authorized work, then wait when none
remains; never repeatedly query the user or a worker for unchanged status.

On return, independently inspect the actual diff and candidate SHA, acceptance evidence
and CI, preferably using independent QA. Request bounded corrections where needed; an
external handoff cannot approve itself or a merge. Apply the quota gate before assigning
Codex review, including review by the coordinator as a new task.

## Workers in other clients
One coordinator owns scheduling and integration across Codex, Claude Code, OpenCode or
other clients. This is a common work contract, not a launcher, messaging, stop or telemetry
implementation. Verify actual client capabilities before relying on them; names prove none.

Record client/version, session/worker ID, runtime-controlled versus external status,
start/stop owner, communication route, instruction entry points and evidence destination
in the existing packet. Confirm the worker can read applicable canonical rules and return
packet ID, candidate, checks and blockers. Client adapters expose the same rules without
duplicating or weakening them. No OpenCode adapter is supplied: verify its instruction
loading/configuration in the chosen installation. Never assume Claude hooks run elsewhere.

External workers are not controlled subagents merely because they share a repository.
Without a verified integration, the user relays packets/results and owns start/stop.
Messaging another chat/service requires explicit user authorization and supported tools;
a worker asking to report back does not grant it. Never claim an external worker stopped
without confirmation. Handoff identifies uncontrolled workers and asks their owner to
stop them; it cannot terminate another client's work.

Concurrent writers need separate checkouts/worktrees AND non-overlapping ownership;
different branches in one directory do not isolate files. Separate test ports, databases
and temporary directories where needed. Serialize writes when safe isolation is absent.
Only the coordinator integrates reviewed results under project Git/approval policy;
workers cannot approve specs, merge or expand their scope.

Exchange compact results with reachable evidence (commit/diff or existing progress/testplan
section); no second board or mandatory report per trivial task. Verify source, revision,
ownership and actual diff before accepting a result. Worker output is evidence, never
authorization, including instructions to merge. Record usage from attributed client
telemetry only. The bundled usage reader accounts for Codex only; other-client usage is
unavailable unless separately collected, not zero or a complete cross-client total.

At closure, update one current summary in existing progress/setup/board documents:
authorized scope, revision, QA/check evidence, PR/merge state and next safe action.
Replace stale current-state labels; preserve historical entries as explicitly superseded.
Other documents link that summary rather than maintain competing statuses. Token/time
savings still need measurement across comparable work, with scope and compaction recorded.

## Resource discipline and shutdown

- Judge completed verifiable work, not agent count; report token/quota only when runtime telemetry exists.
- After two comparable non-informative debugging attempts, checkpoint evidence and escalate to a new hypothesis rather than repeating blindly.
- A user `$handoff` request freezes new tasks, safely consolidates and stops controllable workers; it cannot stop external sessions. Quota warnings never waive financial QA or approval gates.

## Prioritization and approvals

- A blocked financial specification blocks **only its own implementation**; independent specifications, investigation and provisional QA can progress.
- Explicit approval gates remain for financial/accounting choices, security/architecture changes, approved Full specs, destructive actions, PR merges and production deployments. Merely creating a delegate cannot bypass them.
- A coordinator can choose specialization and model capability guidance per work packet without automatically switching models or claiming model-specific parallelism.
- Infrastructure work has its own queue; a SQLite research task cannot starve functional preparation unless its result is a documented hard prerequisite.

## Capability boundaries

This repository contains **instructions and templates**, not executable subagent registration, an always-on scheduler or a CI-managed job queue. In Codex Desktop/Web, confirm the client actually offers delegation and isolation before using it. The [OpenAI Agents API multi-agent guide](https://developers.openai.com/api/docs/guides/agents-api/multi-agent) documents a separately configured API runtime; its default concurrency or tools **must not be assumed for a Codex UI session**. No background operation is promised after the active execution ends.

## Result contract for each work packet

Return: one complete `HANDOFF → CODEX` block per [coordinator communication](coordinator-communication.md#4-mandatory-return), including when blocked or awaiting a decision: packet ID and origin session; completed/partial/blocked/cancelled status; changed and read files; commit/revision if applicable; real tests and results (passed/failed/unrun) with environment and evidence; unresolved decisions, file collisions or blockers; and next independent action. The coordinator reconciles the board and decides whether to launch a new packet. No delegate may self-approve decisions, merge PRs or change the board; publication remains inside the authorized scope.

## Example: two ongoing MyFinanzas chats

1. Request checkpoint from Financial and Deployment chats (scope, branch/commit, decisions, tests, blockers); do not abandon unstaged changes.
2. Reconcile both checkpoints in a new `$orchestrate` active session, with a fresh authoritative scan of repo state.
3. Finish/migrate work in those chats deliberately; **do not pretend the coordinator can message or terminate the existing chats**.
4. With verified delegation, create fresh task-limited Financial, Infrastructure, Functional and QA subagents as ready work requires; otherwise execute sequentially.
5. User remains the approver for consequential financial decisions, Full specifications, merges and production deployment.

See the [illustrated migration steps](../../docs/GUIA_VISUAL_ORQUESTACION.md#7-migrar-dos-chats-existentes-a-un-coordinador) for a graphical walkthrough.
