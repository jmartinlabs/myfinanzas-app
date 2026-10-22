# Adaptive model selection — MyFinanzas (v2.4.2)

Advisory only: the user chooses the model in Codex or Claude Code. Do not assume any client exposes a model or reasoning option, switch models automatically, or block a workflow because a tier is unavailable.

| Task | Capability tier | Reasoning effort |
| --- | --- | --- |
| Straightforward, safe Quick | efficient | low |
| Standard or routine development inside approved scope | balanced | medium |
| Full specification, complex investigation or critical review | advanced | high |

These are starting heuristics, not fixed workflow bindings. Consider risk, ambiguity, phase and user preference (**balanced** by default, **efficiency** or **quality** when requested). Financial integrity, authentication, migration and security reviews may require stronger reasoning even for small edits; a well-specified routine Full implementation may not.

Load on demand, normally for Standard / Full. Omit repetitive advice for a straightforward Quick. Keep the current model when adequate. If unknown, say `suggested, availability unverified`, not an asserted selectable option. Never assume autonomous per-agent model switching or client delegation.

Model advice never replaces real tests, relevant regressions, required independent QA, protected approvals or MyFinanzas's separate development gate. Investigate code and environment before proposing a higher tier after failures. Report token/quota savings only with real client telemetry. See [MyFinanzas coordination](myfinanzas-coordination.md).
