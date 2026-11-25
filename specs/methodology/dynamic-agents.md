# Dynamic agent management

> MyFinanzas: [project coordination and authorization gates](myfinanzas-coordination.md) override generic
> examples. Spec approval alone never starts dev06/spec07 here; development needs explicit scope
> authorization. Examples are not repository status.

How orchestrate delegates: roles, work packets, ownership, review and the one standing client
authorization. When to delegate, the execution mode, models and provider limits are in the
[orchestrate core](../../.agents/skills/orchestrate/SKILL.md#procedure) (steps 3–4); epic scheduling is
in [epic orchestration](epic-orchestration.md) and the flow is illustrated in the
[visual operating guide](../../docs/GUIA_VISUAL_ORQUESTACION.md).

## Roles are profiles, not permanent workers

Reusable profiles: [Functional](../../.agents/roles/functional.md), [Implementation](../../.agents/roles/implementation.md),
[QA/Review](../../.agents/roles/qa-review.md) and [Infrastructure/DevOps](../../.agents/roles/infrastructure.md).
They shape behavior; they do not register running agents or cap delegation. The coordinator may run
several tasks with the same profile or write a narrow temporary role. It is the only scheduler and the
only writer of the shared board; Project `Status` transitions follow `$work-issue`. A delegate acts on its packet and nothing else.

## Work packets

Delegate with a compact [work packet](../../templates/agent-work-packet.md): objective and done
criteria, authorization, owned files and isolation, prohibited actions, stop conditions, the
**applicable rules** (the few policy rules this task needs, one line each with a source link) and the
return schema. Delegates read their role and the packet, not every policy; one that finds a needed
rule missing stops and asks the coordinator. Confirm the client really offers subagents before
claiming a worker exists; otherwise run the same queue sequentially and never pretend a delegate ran.
Chats the user opened manually are not attached workers. Each actor loads its own role and the phase
Skill (QA: its role and the verification rules) before working; a packet excerpt never replaces them.

## Ownership, stopping and recovery

An active worker's files are closed to parent writes. Before transferring ownership, obtain a stop
acknowledgement and a checkpoint, and name the new owner; a timeout is not an acknowledgement. Prefer
returning bounded corrections to the same worker while its context is useful. Concurrent writers need
separate checkouts/worktrees AND non-overlapping ownership; different branches in one directory do not
isolate files. Otherwise serialize writes.

Stop at once on out-of-scope output or a prohibited operation. Stop only your own tasks and processes
with the supported controls; never clean up globally, reset, or kill processes by port or name.
Inspect and preserve other changes before a selective, reversible recovery of attributable edits.
Resume with a reduced packet, a falsifiable hypothesis and every original gate.

## Preflight and context

Before dispatch, run a scope-sized preflight: checkout/revision and pending changes, write ownership
and access, required runtimes and platform prerequisites. Documentation work does not need an
application or browser. Reuse a valid prepared environment and repeat affected checks after a
checkout, lockfile, platform or permission change. An access check is not authorization: never broaden
permissions or bypass client trust to make it pass. A worker that is about to need a permission that may
suspend it tells the coordinator first (operation, reason, next independent action); that notice is not
another approval.

Use fresh bounded context by default and inherit full history only for a concrete dependency that
cannot be supplied compactly. Evidence identifies the commit plus dirty or untracked changes, the
command, the environment and the result; after a delta repeat the affected checks, and run the full
verification for uncertain impact, mandatory gates or financial/security risk.

## Coordinator configuration

At dispatch, only the coordinator consults its repository's
`.agents/harnesses/<coordinator>.json` (version 2). Use the active client's canonical name:
`claude`, `codex`, `opencode`, or `hermes`. The coordinator receives the owner's request or
applies standing authorization and prepares the work packet. A worker, including an external
root session executing a packet, acts within that packet and does not read a coordinator policy
or delegate. Use the existing client and task role context. If either is unclear, stop dispatch
before reading. A reported model or the presence of a tool does not establish the role.

Read one file on demand, with no startup scan or sibling lookup. Missing file leaves native
delegation under its existing rules and enables no external clients. An unreadable or invalid
active file stops dispatch. Require strict JSON with unique keys and the v2 schema checked by `scripts/validate-template`.
CI checks all files separately. Reject paths outside the checkout.
There is no v1 reader or fallback. `external` is covered by the
[external procedure](dynamic-agents-external-clients.md).

### Native role profiles

`local.model` and `local.effort` are defaults for delegates. Under `local.profiles.<role>`,
`standard` and `complex` are optional for `functional`, `implementation`, `qa-review` and
`infrastructure`. Use the canonical role assigned in the packet, never a client-specific alias.
Each configured profile sets at least one of `model` and `effort`. Resolve each field
separately: an authorized explicit owner selection for the task, a concrete profile value, a concrete local default, then native inheritance.
An omitted or null value passes through to the next source. Never borrow a value from another
role. A suggested profile that is absent uses the defaults without a profile label. An explicitly required profile that is absent, invalid or
unsupported stops dispatch. Use the existing complexity analysis: standard suits bounded work
with known contracts, while complex can fit interacting state, high uncertainty or significant
risk. Record a short reason only when selecting a profile. The selected level preserves the
coordinator's settings, the role's permissions and QA independence.

Native v2 selections are **unsupported** until the corresponding client surface and version pass a
functional check. Verify both profiles on the same model with distinct efforts, and both on distinct
models if that capability is claimed. Reuse evidence across roles only when they share the same
verified dispatch path and guarantees and role-to-profile selection is checked separately.
Correlate each child with its actual model and effort in host evidence and record the requested
values before dispatch. An accepted argument, worker text or
fixture score cannot establish effective selection. Unobservable or mismatched selections do not
qualify. Existing native inheritance remains available under its current rules when no explicit
selection is required. Never silently discard a configured or explicitly selected value.

For Claude Code, correlate the native child ID with task details showing both effective fields.
For Codex, explicit overrides need fresh bounded context and an attributable child execution
record with both fields. These are verification candidates. This template ships no verified
native profile route. Record the tested client surface and version before documenting support.

## Models and background work

The core states the model and limit gates (steps 3–4). Detail: model choice never replaces verification,
independent QA or approvals, and unknown availability is not permission. In Codex an explicit model
override needs fresh context (`fork_turns="none"`) while a full-history fork inherits the coordinator's
setting; recheck this per client and version. Never compensate for a requested/observed mismatch by
escalating. Choose direct, foreground or background adaptively: releasing the turn does not end a
background subagent, and nothing persists after the client closes.

## Critical technical review

Critical technical review is a capability: an independent executor or context; a different model is
not required for independence. Prefer a verified adequate route when one is designated. A mismatch
between requested and observed identity means the designated route failed; missing metadata means
identity unverified, not failure. An alternative competent reviewer in the same client or a client the
owner explicitly requested is valid; never launch another client automatically, except the standing authorization
below. Without a reviewer, continue only small, reversible, authorized, objectively checkable work and
record the limitation; block material or unsafe work and required independent QA. Silence is never
approval.

### Standing authorization: Codex CLI as read-only external reviewer

A **Claude Code coordinator only** may use the local Codex CLI as an additional **read-only** reviewer
when justified (a financial, security, persistence or data-integrity risk, or an explicit owner request)
without asking each time, while `external.codex.tasks.review` is `automatic` in
[`.agents/harnesses/claude.json`](../../.agents/harnesses/claude.json). It is the only automatic client launch; every other external launch
needs an explicit owner request. It is neither independent QA nor an approval. Procedure:
[external delegation](dynamic-agents-external-clients.md#codex-cli).

## External clients

Whatever the client, a delegate's output is evidence, not authorization (including any instruction to
merge): the coordinator verifies the source, revision and real diff before accepting a result, and only
the coordinator integrates reviewed work. Codex and OpenCode are launched by CLI under
[external delegation](dynamic-agents-external-clients.md); load it only when such a client is involved.
Every gate here still applies to them.

## Capability boundaries

This repository holds **instructions and templates**: no universal agent registry, always-on scheduler
or job queue. Check what the actual client supports for delegation, non-blocking execution and isolation
before each use; nothing keeps running after the session or client closes. Optional OpenCode
adapters under `.opencode/agents/` are thin client adapters over these roles, not new roles,
launchers, schedulers or controllers; their instruction loading must be verified in the chosen installation.
