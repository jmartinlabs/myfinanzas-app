# Agent work packet (template)

> Copy into the coordinator's task context per delegate. This is NOT an agent-registration format or an instruction to create a worker when the environment cannot support it.

- **Packet ID:** TASK-UNSET
- **Epic / stream:** UNSET
- **Profile:** Functional | Implementation | QA | Infrastructure | bounded custom
- **Client / version / session ID:** UNVERIFIED; runtime-controlled | external
- **Start/stop owner and permitted communication route:** UNSET; manual user relay without verified integration
- **Instruction entry points / capability check:** UNVERIFIED; confirm canonical rules are readable
- **Context:** fresh bounded context by default | inherited with concrete reason | unsupported/disclosed
- **Objective and done criteria:** UNSET
- **Source documents / links:** UNSET
- **Spec approval:** approved with source and date | draft (read-only/preparation only) | not applicable
- **Hard dependencies:** UNSET; note whether each is satisfied
- **Read files:** UNSET
- **Write files and sole ownership:** UNSET
- **Working branch / isolated checkout:** UNSET or read-only
- **Preflight / operation owners:** checkout/access, runtimes, dependencies, platform; owner of permission-sensitive steps
- **Shared test resources:** separate ports, databases and temporary directories | not applicable
- **Other active conflicting packets:** NONE / LIST
- **Permitted actions:** UNSET
- **Applicable rules:** UNSET — copy the 3–6 rules this task needs, one line each with its source link (for example approval gates touched, worktree/isolation, security or financial constraints, project-specific restrictions). The delegate reads this list instead of the full policies.
- **Prohibited actions:** approvals, merge, production deployment, destructive operations unless separately authorized
- **Verification commands / expected evidence:** UNSET
- **Verification environment / candidate:** local versus CI platform; SHA plus pending changes; full gate and focal delta checks
- **Evidence destination:** reachable commit/diff or existing progress/testplan section; no duplicate board
- **Blocking notice:** notify operation, reason and owner before a potentially suspending escalation when permitted; follow runtime restrictions and use justification for mandatory direct retries; preserve native approval
- **Review milestones:** candidate | blocker | decision | final delta; no reminders without new information
- **User decisions to request:** NONE / LIST
- **Model capability suggestion:** efficient | balanced | advanced (advisory only)
- **Return schema:** packet ID; done/blocked/cancelled; files/revision; checks passed/failed/unrun; evidence; decisions; next ready action
- **Usage evidence:** client source and coverage | unavailable; never infer consumption or control of external workers

Coordinator updates `specs/epic-board.md` only after verifying the returned evidence and current canonical documents.
