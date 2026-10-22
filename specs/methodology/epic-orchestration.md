# Epic orchestration: concurrent progress without bypassing approvals (v2.3.1)

> MyFinanzas: [project coordination and authorization gates](myfinanzas-coordination.md)
> override generic examples. Spec approval alone never starts dev06/spec07 here;
> development needs explicit scope authorization. Examples are not repository status.

This policy applies to complex **Full** work and to Standard work with several independent workstreams. It extends [adaptive workflows](workflows.md) rather than replacing `$roadmap`, `$spec` or `$dev`. Quick remains single-stream by default.

## Persistent board and single writer

When a roadmap has more than one active, blocked, or upcoming item, keep `specs/epic-board.md` using [the board template](../../templates/epic-board.md). Reconstruct from existing approved roadmap, specifications, progress files, test plans, and Git state. If some evidence is unavailable, record `unknown` or `unverified`; never manufacture an approval or completion.

The coordinator is the **only writer** of the shared board. Delegates return concise status/evidence; the coordinator reconciles it after verifying authoritative files and check results. Canonical approved decisions remain in specs/guidelines, not duplicated into the board.

Each row has a unique feature ID and tracks stage, scope/dependencies, approval, assigned role, isolated branch/checkout (if applicable), blockers, evidence link, next action and last verification. A ready task is not the same as an approved spec. A PR opened is not a merge.

## Stage/gate rules

- `spec`: planned → drafting → awaiting-approval → approved. Drafts and brainstorming may be prepared autonomously, but **only the user approves functional/financial decisions and the final spec**. A prepared next epic remains draft until approved.
- `dev`: not-ready → ready → implementing → testing/review → verified. `dev` is ready only with a recorded **approved** spec, satisfied hard dependencies and authorization for its scope. If there is no approved spec, the implementation lane cannot start. QA may still draft test cases without altering production code.
- `QA`: planned → test-design → awaiting-implementation → verifying → passed/failed/blocked. Independent test design and investigation can overlap another feature's spec or dev. Never claim tests passed before execution against the actual candidate.
- `merge`: proposed PR → ready-for-user-review → user-approved → merged. Never auto-merge or push/create remote PR without required repository authorization. PR readiness requires current tests/review evidence; branch merge is a separate approval gate.

## Scheduler: check after each event

1. Read board and canonical files; reconcile Git/PR/test status before treating any recorded state as current.
2. Identify gates and hard dependencies. Mark blocked only where there is a real dependency; cite the specific prerequisite and owner. Distinguish user decision needed from environment/technical blocker.
3. Compute independent **ready** work across lanes: (a) implement already approved specifications; (b) verify completed increments or prepare independent QA test designs; (c) draft the next specification up to its approval boundary; (d) investigate a bounded technical risk with a stated question and exit condition.
4. Prefer user priorities and critical-path work, but do not starve next-feature preparation because an unrelated investigation is running. When any work is blocked, promptly pick the next independent ready item.
5. Assign roles to bounded work packets; isolate overlapping writes. A single checkout can support **parallel read-only research**, not uncontrolled simultaneous edits. For independent code edits use distinct branches/checkouts or worktrees **only when authorized and supported**; otherwise serialize writes. One role owns each editable file range.
6. After work completes or approval arrives, update the board, re-evaluate dependencies and autonomously hand off to the next authorized step in the **same active execution**. Spec approved + explicit feature development authorization → dev ready; dev verified → QA/review; QA passed → prepare PR for approval. The user does not have to type `$dev` manually.
7. End an active run with a concise board summary: completed, underway, waiting on user, blocked, newly ready, and exact next action. No claim of background processing between sessions; rescan on next invocation.

Use [dynamic agent management](dynamic-agents.md) to size and supervise specialist work. Start with one to three concurrent specialist work packets by default; four or more is possible **only** when a real client/runtime permits it and independent work justifies its overhead, risk and usage. These are advisory limits, not universal Codex caps. Roles are templates, not fixed agents, and the same role can serve multiple independent tasks. Do not invent agent tools or assume Desktop/Web concurrency support; use a sequential fallback with the **same dependency logic**.

## Independent specialist work packets

The coordinator gives each delegate: feature ID, role, source spec and approval state, concrete deliverables, read/write files, dependencies, prohibited actions, validation checks, and a result format (outcome, evidence, blockers, proposed next work). See [role contracts](../../.agents/roles/README.md) and the [work packet template](../../templates/agent-work-packet.md). Specialists cannot promote draft to approved, merge a PR or update the shared board themselves.

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

Resuming a session: read `AGENTS.md`, board, approved specs, roadmap, latest progress/test evidence and Git state; reconcile stale pointers; keep approval gates. Record blocked, failed, unrun and passed checks distinctly. A CI success for the methodology template does not prove these behaviors work in an actual Codex session.
