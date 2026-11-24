# Agent work packet (template)

> Copy into the coordinator's task context per delegate. This is NOT an agent-registration format or an instruction to create a worker when the environment cannot support it. A Quick task the coordinator does itself needs no packet; add a field only when it applies.

- **Packet ID and profile:** `TASK-UNSET` until assigned; Functional | Implementation | QA | Infrastructure | bounded custom. The responsible actor loads its role and the phase Skill before working.
- **Objective and done criteria:** UNSET
- **Workflow and authorization:** Quick/tweak | Standard/task with scope authorization | Full/dev with an approved spec AND separate MyFinanzas development authorization; source and date (approved spec, or draft: documentary editing only, no code); hard dependencies and whether each is satisfied.
- **Files and isolation:** files to read; files written under sole ownership; working branch or isolated checkout (or read-only); other active packets that could conflict.
- **Prohibited actions:** approvals, merge, production deployment and destructive operations; running `work-issue`, claiming Issues or writing Project `Status`; delegating further. Publication (push, PR) only when the authorized scope includes it.
- **Applicable rules:** the 3–6 rules this task needs, one line each with its source link (approval gates touched, isolation, security or financial constraints, project-specific restrictions). The delegate reads this list instead of the full policies.
- **Verification:** commands and expected evidence; environment and candidate (SHA plus pending changes); where the evidence is kept (a reachable commit/diff or the existing progress/test-plan section, never a second board).
- **Return:** packet ID; status COMPLETED / PARTIAL / BLOCKED / CANCELLED; candidate and changed files; each check PASS / FAIL / UNRUN with command, environment and evidence; risks, decisions needed and next action. Questions and approvals go to the coordinator, never directly to the user.
- **Only if it applies:** requested model/effort and, afterwards, the observed values or `unverified`; inherited context and its reason; client, version and session for an external client, and the Agent Relay v1 conversation ID that owns start/stop; shared test resources (separate ports, databases, temporary directories); who owns an operation that may need a permission; review milestones.

External clients (Codex, OpenCode) are launched by CLI under [external delegation](../specs/methodology/dynamic-agents-external-clients.md); Agent Relay v1 remains optional transport. The coordinator updates the Issue's `Status` and report only after verifying the returned evidence and current canonical documents.
