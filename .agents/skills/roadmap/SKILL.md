---
name: roadmap
description: Interview the user and produce or revise an approved four-epic MVP roadmap without implementing code.
---

# roadmap

## Inputs
Read `AGENTS.md`, `specs/README.md`, existing state and applicable guidelines before acting.
## Outputs
Approved `specs/roadmap.md` based on `templates/roadmap.md`, committed locally.
## Procedure
Read product context, architecture, applicable UI/quality guidelines and existing roadmap.
Identify the main user experience. Interview in short rounds with recommendations; aim
for no more than two rounds where practical. Preserve prior approved scope.
Default to exactly four MVP epics unless the user explicitly approves a different count.
Epic 1 delivers the smallest functional version of the main user experience. Each epic
must be independently useful and verifiable, not just an infrastructure layer.
For each numbered epic document user capability, visible/otherwise observable outcome,
explicit exclusions and concrete completion verification. Include dependencies and scope.
Present the proposal, resolve material questions and obtain approval. Record approval
source/date in the roadmap. Review and commit only approved documentation changes.
## Stop conditions
Wait for missing product decisions or roadmap approval; save pending questions. Do not
implement code during this workflow. Stop after the approved roadmap is committed, and
suggest `$spec 01` for the first epic.
