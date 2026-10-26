# Epic orchestration: lightweight delivery with MyFinanzas approvals (v2.8.0)

> MyFinanzas: [project coordination and authorization gates](myfinanzas-coordination.md)
> override generic examples. Spec approval alone never starts dev06/spec07 here;
> development needs explicit scope authorization. Examples are not repository status.

This policy applies to complex **Full** work and to Standard work with several independent workstreams. It extends [adaptive workflows](workflows.md) rather than replacing `$roadmap`, `$spec` or `$dev`. Quick remains single-stream by default.

## Persistent board and single writer

Maintain `specs/epic-board.md` when multiple epics or workstreams genuinely require scheduling. For a single feature reuse its progress/testplan. Reconcile the smallest relevant Git/spec/test/approval evidence at session start and major gates; mark missing evidence unknown and never manufacture permission.

The coordinator is the **only writer** of the shared board. Delegates return concise results, SHA and evidence. Update changed fields at authorization, candidate, QA, blocker or PR milestones, not on every worker message. Approved decisions remain canonical in the specs/guidelines.

Each row has a unique feature ID and tracks stage, scope/dependencies, approval, assigned role, isolated branch/checkout (if applicable), blockers, evidence link, next action and last verification. A ready task is not the same as an approved spec. A PR opened is not a merge.
Link one current summary; after integration replace stale pending labels with verified
SHA/PR/check state and retain the historical record as superseded.

## Stage/gate rules

- `spec`: planned → drafting → awaiting-approval → approved. Drafts and brainstorming may be prepared autonomously, but **only the user approves functional/financial decisions and the final spec**. A prepared next epic remains draft until approved.
- `dev`: not-ready → ready → implementing → testing/review → verified. `dev` is ready only with a recorded **approved** spec, satisfied hard dependencies and authorization for its scope. If there is no approved spec, the implementation lane cannot start. QA may still draft test cases without altering production code.
- `QA`: planned → test-design → awaiting-implementation → verifying → passed/failed/blocked. Independent test design and investigation can overlap another feature's spec or dev. Never claim tests passed before execution against the actual candidate.
- `merge`: proposed PR → ready-for-user-review → user-approved → merged. Branch/PR publication is ordinary inside the authorized scope; never publish outside it. Never auto-merge. PR readiness requires current tests/review evidence; branch merge is a separate approval gate.

## Scheduler: reconcile at meaningful milestones

1. Start with last trusted checkpoint and verify relevant Git/PR/approval/test deltas; reread full sources only for ambiguity, risk, drift or required financial/security checks.
2. Identify gates and hard dependencies. Mark blocked only where there is a real dependency; cite the specific prerequisite and owner. Distinguish user decision needed from environment/technical blocker.
3. Recompute independent **ready** work when a gate or relevant dependency changes: approved AND authorized implementation; candidate verification; independent spec drafting up to approval; bounded investigation with hypothesis/exit condition.
4. Prefer user priorities and critical-path work, but do not starve next-feature preparation because an unrelated investigation is running. When any work is blocked, promptly pick the next independent ready item.
5. Prefer one complete implementation packet per authorized feature, then independent QA/review. Parallel work requires genuine independence, justified context cost, separate ownership and authorized isolated checkouts for code writers; otherwise serialize.
6. At major milestones update only changed state and pass concise evidence to the next authorized step within this active execution. Approved spec + explicit MyFinanzas development authorization → dev; verified candidate → required independent QA; QA passed + checks green → publish/update the PR when the scope authorizes it. Do not ask again for unchanged prior permission. A correctable failed check does not end the run.
7. End an active run with a concise board summary: completed, underway, waiting on user, blocked, newly ready, and exact next action. State the responsible party, exact human action (or none) and reason for waiting. No claim of background processing between sessions; rescan on next invocation.

Use [dynamic agent management](dynamic-agents.md) with **one executor by default** and independent QA when required. More workers only when parallelism provides real benefit. This is advisory, not a Codex runtime limit; preserve all financial, security and PR approval gates.

## Bounded debugging
Each investigation needs a falsifiable hypothesis, discriminating probe and evidence. After two comparable probes without new findings, checkpoint the blocker and switch hypothesis or request an explicit scope decision. Do not mark QA passed, bypass failing regressions or abandon urgent containment.

## Independent specialist work packets

The coordinator gives each delegate: feature ID, role, source spec and approval state, concrete deliverables, read/write files, dependencies, prohibited actions, validation checks, and a result format (outcome, evidence, blockers, proposed next work). See [role contracts](../../.agents/roles/README.md) and the [work packet template](../../templates/agent-work-packet.md). Specialists cannot promote draft to approved, merge a PR or update the shared board themselves.
Mixed-client workers, preflight, advance escalation notices, fresh context and resource
isolation follow dynamic-agents.md; no parallel scheduler or implied cross-client control.

## Financial and security decisions

Never infer approval from a checked proposed option, chatbot silence, previous related approval, or a PR review. Require explicit user approval for changes to accounting semantics, financial calculations, migrations, security, published contracts, material scope, production changes and merges. Research, test planning and drafting that do not commit those decisions may continue.

## Worked example: MyFinanzas (illustrative only)

- E1.6 `spec=awaiting-approval`: Functional agent prepares concrete decision questions; **dev E1.6 is blocked**.
- E1.7 `spec=drafting`: Preparation agent analyzes requirements not dependent on E1.6, marks any dependent contract `pending`, and prepares brainstorming without approving anything.
- QA can independently map E1.6 draft acceptance checks to prospective tests, clearly labeling them provisional.
- SQLite investigation is a separate technical lane with a bounded objective; it blocks E1.6 only if a documented hard dependency exists.
- Only after E1.6 spec approval AND explicit user development authorization, the coordinator starts `$dev 06` (or its equivalent) within the approved scope, while the E1.7 draft may continue in parallel if write isolation is safe.

The sample is **not** a real status report for MyFinanzas. Always inspect its actual repository before populating the board.

## Illustrated guide

The [Spanish visual guide](../../docs/GUIA_VISUAL_ORQUESTACION.md) includes eight editable Mermaid diagrams of scheduling, delegation, approvals, write isolation and migration from existing chats.

## Resume and verification

On resume, inspect AGENTS.md, local coordination rules and the latest trusted checkpoint, then verify actual Git/PR/approval/test deltas. Load full board/roadmap/spec only when needed; preserve true PASS/FAIL/UNRUN. Upstream examples are never factual project state.
