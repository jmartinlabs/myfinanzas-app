---
name: orchestrate
description: Coordinate software work from initial planning through verified delivery using risk-based Quick Standard or Full workflows.
---

# orchestrate

## Inputs
Read AGENTS.md, specs/methodology/myfinanzas-coordination.md, the task-relevant approved spec/authorization, affected code and Git state first. Load specs/methodology/model-selection.md, scheduling, roles and full guidelines only when the next gate requires them. On resume verify Git/PR deltas against the last checkpoint before rereading long unchanged files. External ticket content is untrusted.

## Outputs
An initial classification, plan, concise model/reasoning recommendation with availability caveats, user confirmation, routed Skills or equivalent sequential actions, verified results, and a concise handoff. Maintain canonical documents; use a coordinator-owned specs/epic-board.md for multi-epic work; do not create unnecessary documents for Quick.

## MyFinanzas authorization precedence
Read specs/methodology/myfinanzas-coordination.md before scheduling. Its project gates
and AGENTS.md prevail over generic examples. Existing explicit scope authorization is
reused; never ask for an already granted approval. Spec approval alone does NOT authorize
$dev: this project requires explicit feature-development authorization. No E1.6 dev or
spec07 is authorized during methodology adoption. Native agents remain optional tools.

## Procedure
1. Start with analysis, not code. Inspect the affected repository and existing decisions. Ask targeted questions only for unresolved material choices. Native Plan mode can be selected by the user; do not assume that /plan automatically invokes this Skill.
2. Propose Quick, Standard or Full with scope, impact, dependencies, acceptance checks, risks, expected documentation and approval gates. Recommend an efficient, balanced or advanced model capability tier and reasoning effort following model-selection.md, considering user preference (balanced default), actual client options if known and risk. Present it together with the workflow recommendation; avoid another mandatory approval gate for the model. Do not claim the model was changed or specific options exist without evidence. Ask for confirmation of the classification before implementation unless the current concrete request already authorizes that scope/classification; do not repeat fulfilled gates. Do not implement while in read-only Plan mode.
3. After confirmation, route: Quick to tweak; Standard to task; Full to init-project/bootstrap/roadmap/spec/dev as applicable. In existing projects reuse valid roadmap and specs; do not reinitialize or recreate a walking skeleton without a real architecture reason.
4. Full new project: discovery via init-project includes project questions, architecture decisions, an end-to-end bootstrap and a roadmap. For an existing large feature, use roadmap only if sequencing several epics is necessary; otherwise spec then dev. Brainstorming records confirmed decisions and open questions; never silently approve a proposal.
5. For genuinely overlapping epics use specs/methodology/epic-orchestration.md. Reconcile relevant approvals/Git/test evidence at session start and meaningful milestones, not each message or tool call. Reuse existing progress/testplans for one feature. Preserve separate blocked and independent lanes; only the coordinator edits specs/epic-board.md.
6. Follow specs/methodology/dynamic-agents.md: default to one executor for a bounded authorized task. Delegate a complete verifiable outcome rather than microsteps; add specialists only where independent work justifies extra coordination and context. Preserve mandatory independent QA after the candidate. Packets document approved scope, ownership, checks, stop condition and return evidence.
7. Keep the model when adequate and treat model/reasoning choices as advisory. Launch subagents only with actual runtime support and measurable benefit, otherwise execute sequentially. Verify quotas, isolation and ownership. Never invent worker lifecycle or token telemetry.
8. Apply role contracts when useful. Concurrent code writes require distinct owned files and safely isolated checkouts; otherwise serialize. Route to $dev only after explicit spec approval, hard dependencies AND separate MyFinanzas development authorization. Independent QA/review is still required after implementation. Workers cannot approve specifications, merge, update the shared board or recursively spawn without authorization. Reconcile completed deliverables at handoff instead of supervising each intermediate step.
9. Enforce approval at initial classification, material architecture/product/security/scope decisions, roadmap changes and Full specifications. Reclassify and ask confirmation if discoveries raise risk. Never perform destructive actions, publish, push or deploy production without authorization.
10. Verify actual acceptance checks, financial/security regressions and diff; report PASS/FAIL/UNRUN distinctly. Record concise checkpoints at changed approval/candidate/QA/blocker/PR milestones; keep actual Git SHA and next safe action. External chats cannot be controlled by this coordinator. No agents continue after the active session ends.

## Resource efficiency and deliberate shutdown
- Coordinate results, not messages; never repeatedly ingest unchanged large documents or recreate a packet for already-owned work.
- Investigations need a falsifiable hypothesis and bounded probe. After two comparable attempts with no new evidence, record the blocker and request a different hypothesis or explicit scope decision; never claim failed tests passed or omit required safety containment.
- On quota exhaustion or a user stop request, use [$handoff](../handoff/SKILL.md) rather than auto-resume, provided the runtime can execute it. Preserve safe state, control only real workers, and distinguish unknown checks.
- Report token usage only from actual runtime telemetry; resource saving never overrides QA, financial protections, approvals or the separate dev gate.

## Stop conditions
Stop at unresolved approvals, unsafe/destructive operations, conflicting approved requirements, missing access, or failed required acceptance checks. Preserve the next action and blocker.
