# Delegation evaluation protocol — MyFinanzas #515 and #511

## Provenance and evidence status
Historical baseline: MyFinanzas origin/test and implementation base
`1d49971c85d86d34aaf134c83280f9bebc8c2ebd` (2026-11-18). Template issue #54 motivated
this local adoption; this candidate does not modify the template repository.
Supervision source: #511 / PR #509, head `2ece6ae010808e5270131dbb83a98f11a793bb29`
(commits `4d8df22`, `2ece6ae`), adapted rather than merged. PR #509 remains separate.
Historical Hermes discovery evidence is in [its adapter](HERMES_ADAPTER.md).
Retrospective narratives are reports, not raw verified performance evidence. The old
OpenCode overlap sample proves only observed viability, not saving or model identity.
No paid runs, global profiles, trust, providers or authentication are changed. The external
Hermes profile Skill is outside this repository and has not been updated; canonical packet
rules here supply the portable control contract, not evidence of that profile's adoption.

## Reproducible post-adoption experiment — UNRUN
Freeze before/after SHAs, client/version, model/effort requested and observed, platform,
dependencies, task inputs, acceptance checks and raw logs. First compare Hermes on the same
models, tasks and environment. Only then compare clients/models, labeling confounders.
Run a natural baseline using each revision's actual routing decisions; keep forced-direct
and forced-delegated experiments separate. Do not mix them into a claimed natural improvement.
Use matched disposable checkouts and synthetic data, repeat comparable cases, record variance
and failures rather than selecting best runs. Keep scope, compaction and available runtime
features fixed or explicitly report differences. Never infer missing tokens/cost as zero.

Cases: Quick reversible edit; substantial bounded Standard implementation; two disjoint
independently authorized tasks; seeded QA defect. For each record decision, owner, loaded
Skills before phase, mode mapped to actual runtime semantics, context size/compaction,
raw attributable usage/time when available, result quality, escaped defects, corrections,
ownership transfer acknowledgements, gates and independent QA. Observe whether direct work
has a concrete reason and delegation is reconsidered after growth/repeated corrections.
Seeded QA distinguishes own checks, reused candidate/environment logs, review and UNRUN;
reusing evidence must preserve mandatory gates, never count a developer summary as execution.

Additional #511 acceptance scenarios (live experiment UNRUN):

| Scenario | Expected contract outcome |
| --- | --- |
| Mass deviation with reviewer | Stop owned work, snapshot evidence, preserve prior changes, review and reduce packet before resume |
| Advisor absent/misrouted | Unknown identity differs from mismatch; alternative independent context or manual handoff, block material work without reviewer |
| Prohibited operation | Immediate stop regardless of file/time threshold; no global process killing or cleanup |
| Benign reversible work without reviewer | Continue only objectively checked authorized small work, disclose limitation; required QA remains pending |

Gate violations, lost work, fake evidence or lower quality defeat an efficiency claim.
Compare raw paired outcomes, medians/ranges and exact coverage; mark absent telemetry
UNAVAILABLE and unexecuted live scenarios UNRUN. Harness mutation tests demonstrate static
contract enforcement only; they do not demonstrate agent behavior, Linux SQLite, browser
coverage, runtime routing or measured savings. Record results in the existing Issue/current
summary, not a new operational tracker.

## Portability map

| Rule | Generic template candidate | Local MyFinanzas canonical rule | Hermes adaptation |
| --- | --- | --- | --- |
| Standard/Full and Skill order | Candidate for upstream #54, not applied here | [implementation role](../.agents/roles/implementation.md), [task](../.agents/skills/task/SKILL.md) | [adapter](HERMES_ADAPTER.md); `/task` versus `/dev` |
| Ownership, dispatch, runtime and recovery | Portable policy proposal, not template state | [dynamic agents](../specs/methodology/dynamic-agents.md) | Capability checks per recorded version; no invented persistence |
| Technical critical review | Capability independent of provider | [local coordination](../specs/methodology/myfinanzas-coordination.md), [models/quota](../specs/methodology/model-selection.md) | Verified route via existing check-delegation-route; external profile unchanged |
| Evidence and transport | Native compact/manual complete distinction | [QA](../.agents/roles/qa-review.md), [packet](../templates/agent-work-packet.md) | Native metadata checked; manual Agent Relay HANDOFF unchanged |
