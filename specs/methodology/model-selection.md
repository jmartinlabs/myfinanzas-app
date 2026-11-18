# Adaptive model selection

The user controls the coordinator model; never change it as a consequence of delegation.
Verify client capabilities before selecting subagent settings. Unknown availability is not
permission to inherit an unchecked model. Model choice never replaces verification,
independent QA or protected approvals. Report savings only from real telemetry.

## Codex subagents: absolute ceiling
The maximum permitted combination is `gpt-6.1-sol` + `low` (UI: GPT-6.1 Sol Light).
Never automatically escalate model or reasoning above this ceiling, including for QA.
Use an explicitly selected economical available model for straightforward bounded work;
reserve `gpt-6.1-sol` + `low` for complex or critical work. There is no numeric cost or
capability ordering across model families: use a verified permitted economical option,
not an inferred ranking. Never substitute Astra or another unverified family/version.

Before dispatch, record requested model/effort, available controls and the selection
assurance supplied by the runtime. In this Codex runtime, explicit `model` and
`reasoning_effort` overrides require fresh context (`fork_turns="none"`); full-history
forks inherit settings. Recheck this capability in other clients/versions. If selection
cannot be guaranteed within the ceiling, do not spawn; record the limitation and work
sequentially within authorization, or propose a manual permitted alternative. Never
silently inherit an unchecked coordinator model. Do not raise the coordinator model.

After dispatch, verify observed model/effort from attributable runtime metadata or local
records when exposed. Record requested versus observed values and evidence; an agent's
self-report is insufficient. Missing metadata means **effective selection unverified**,
not a passed check. A mismatch stops further dispatch and requires investigation at a
safe boundary; never compensate by escalating.

### Delegation routes (`delegation.backend: model_map`)
A route is a **slot** defined by an entry in `delegation.backends.model_map.options` — name,
provider, model, optional reasoning effort — not a fixed model. `worker`, `advisor` or any other
name may change provider, model or effort without touching the verifier, its tests or this
document. Today's configuration is coordinator and `worker` on DeepSeek, and `advisor` on
`openai-codex` + `gpt-6.1-sol` with effort `low`, reserved for critical reviews; the advisor slot
never replaces independent QA.

Measured failure mode (Hermes `model_map`, 2026-11-15): a per-task route parameter sometimes
never reaches the tool. The emitted call carries only `goal`/`context`, no error is raised, and
the task runs on the backend's `default` route — an `advisor` review silently executed by
`worker`. Of four dispatches, the two with a `goal` above ~2 500 characters lost it and the two
with a short `goal` (material in `context`) kept it. Keep `goal` short and put the payload in
`context`; the runtime copies arguments verbatim and the route resolved correctly whenever the
field arrived, so the loss is upstream of the plugin, not a routing bug to work around.

Before accepting a routed result, read the effective route from metadata: while it runs,
`delegate_task(action='list')` reports each child's `model`; afterwards,
`scripts/check-delegation-route --profile <profile> --delegation <id> --expect-label <option>
[--expect-provider <provider>] [--expect-model <model>] [--expect-effort <effort>]` reads it from
`state.db`. It passes only when every task finished `completed` and matched every requested
expectation; a task that did not finish, a mismatch, unreadable or malformed metadata, or a call
without any expectation never yields PASS (exit 2 is "no verdict", never a pass).

Where the expectations come from, and what the runtime can answer:

- **Recovered per task** by the check: route `label`, `provider`, `model`, `reasoning_effort` and
  the task's `status`.
- **Not recovered**: the option name requested at dispatch. Hermes keeps `task_json.model` — the
  model resolved at dispatch, blank when the tasks of a batch took different routes — but not the
  `option` parameter, nor the requested provider or effort. The coordinator therefore supplies the
  expectations from the option entry it actually dispatched with.
- Take them from **that** entry, not from the runtime's resolved values and not from the config as
  it reads after the run: the configuration can change between dispatch and check, and a model
  configured now is not the one expected then.
- Prefer `--delegation <id>` over `--latest`: with concurrent sessions the newest row may belong to
  another delegation.

A mismatch means the designated route failed; unavailable metadata means effective identity
is unverified, not proof that the route was not used. Do not credit the designated route in
either case; stop further dispatch at a safe boundary and investigate or record the blocker.
A same-model reviewer with independent context can still be independent QA; route identity
and independent review are separate checks.

## Portable advice
| Work | Suggested tier | Suggested reasoning |
| --- | --- | --- |
| Straightforward Quick | efficient | low |
| Bounded Standard implementation | balanced | within client policy |
| Architecture, ambiguous debugging or critical review | advanced | within client policy |

These are advisory capability labels, not permission to exceed the Codex ceiling.
Keep the current coordinator model when adequate. In Claude Code retain existing
`model: inherit` profiles unless an authorized client-specific selection is supported;
Claude model/effort names are not equivalent to GPT settings. Codex limits apply to
Codex subagents even when another client coordinates them. Do not invent cross-client
quota or telemetry. When unavailable, use smaller verifiable increments or report a blocker.

Load this document when model advice matters, normally Standard / Full. Report one compact
line: task, client, requested model/effort, assurance and observed evidence (or
`suggested, availability unverified`). Add no separate approval gate beyond quota and
existing project approvals. Native client settings remain subject to actual availability.

## MyFinanzas precedence
Financial integrity, security, required independent QA and the separate development/merge gates remain mandatory under [local coordination](myfinanzas-coordination.md). Resource limits never waive them.

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
  Propose an Agent Relay v1 conversation only if enabled and suitable. Required QA stays pending until
  authorized or otherwise independently performed under the existing quality contract.
- **5% or less:** warn and stop initiating new tasks. Previous authorizations do not
  suffice: require a new explicit task authorization after this warning. Preserve state
  and existing advances at safe boundaries; do not destructively interrupt running work.
  Do not launch another Codex task merely to save a checkpoint; preserve it in the current
  session where possible. No automatic replacement workers or paid quota reset.

Record task-specific exceptions and their relation to the warning in the existing packet
or current summary. A warning is not approval; quota exceptions never waive QA or merges.
