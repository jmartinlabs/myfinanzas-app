---
name: init-project
description: Start or resume interactive project initialization, from identity to an approved roadmap.
---

# init-project

## Inputs
Read `AGENTS.md`, `specs/README.md`, existing state and applicable guidelines before acting.
## Outputs
`specs/project.md`, canonical guidelines, `specs/setup-progress.md`, verified bootstrap
and approved `specs/roadmap.md`. Do not generate an application in the original template.
## Procedure
Inspect existing code, references and documents first. If this is the template itself,
help create/open an independent derived repository, with publication authorization.
Do not clone again when already in a derived project. Use the current checkout; do not
create a Git worktree unless explicitly requested.

### Resume protocol
If `specs/setup-progress.md` exists, read it and follow its next action. Verify linked
outputs still exist and correspond to recorded evidence; reconcile stale or conflicting
state with the user instead of restarting or trusting a completed checkbox alone.
If missing, reconstruct from existing documents/code and confirm ambiguous state.
Persist before every pause and after every completed stage. Use this state shape:

```markdown
# Setup progress
Current stage: 1
| Stage | Status | Evidence / canonical decision links |
| --- | --- | --- |
| 1 Identity | pending | |
| 2 Technology | pending | |
| 3 Architecture | pending | |
| 4 Bootstrap | pending | |
| 5 Guidelines | pending | |
| 6 Roadmap | pending | |
| 7 Handoff | pending | |
## Confirmed decisions
Links to canonical guideline sections and approval records only.
## Pending decisions
Unanswered questions; recommendations remain unapproved.
## Next action
One concrete action or exact question to resume.
```
Use pending, awaiting-approval, in-progress, blocked or complete. Store architectural
choices once in guidelines; state links to them. Record the user's actual approvals.
Ask in small rounds (typically 1–3 related questions), skipping known answers. Explain
trade-offs and a recommendation. Never treat a default or elapsed time as approval.

### Stage 1 — Identity
Ask name, objective, target users, system type, main problem and existing code/documents/
references. Save confirmed product context in `specs/project.md`.
### Stage 2 — Technology
Discuss only relevant frontend, backend, language, database, API, authentication, testing
and hosting choices. Compare viable options; recommend with reasons. Record approved
choices in architecture and related guidelines. Wait for material decision approval.
### Stage 3 — Architecture
Propose structure, module responsibilities/communication, data ownership/persistence,
dependency management, security and testing. Record unresolved issues. Obtain approval
of material boundaries before code; do not invent reasons.
### Stage 4 — Bootstrap
Read and follow the bootstrap Skill. Verify its actual end-to-end flow and tests before
marking complete. A service process alone is insufficient.
### Stage 5 — Guidelines
Document implemented architecture and approved rationale. Complete architecture, UI,
quality and security guidelines; explicitly mark inapplicable areas with reasons.
Update the thin AGENTS file with project description, actual commands and links.
Implement suitable enforceable rules, proving valid and invalid cases and legitimate
operations. Prefer tests/linters/CI; do not invent agent hooks.
### Stage 6 — Roadmap
Read and follow the roadmap Skill. Obtain approval and commit the initial roadmap.
### Stage 7 — Handoff
Summarize confirmed decisions by link, technologies, architecture, verified bootstrap,
documentation, roadmap and pending questions. Explain `$spec 01` then `$dev 01`.
Mark complete only when required stages have evidence and no blocking questions remain.
## Stop conditions
Pause for each unanswered material choice, conflicting prior decision, missing prerequisite
or required authorization. Persist pending question and next action before waiting.
Resume at that boundary, not from stage 1. No unapproved feature implementation.
