# NN — FEATURE: Progress

Specification: SPECIFICATION_PATH

Keep one current summary per task, replaced in place. The GitHub Project `Status` and its Issue
are the single current-state surface; this table is history only: never keep two competing statuses.
Everything below the table is append-only; a correction is a new dated entry, not an edit.

## Current state — local summary

Keep this table as a short local summary of the feature. The Project `Status` and the Issue
remain authoritative, so never contradict them here.

| Task | State | Owner (start/stop, permission-sensitive operations) | Branch / candidate SHA | Checks last verified | PR / CI / merge | Next action | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UNDECIDED | PENDIENTE | UNVERIFIED | UNVERIFIED | UNRUN | UNVERIFIED | UNDECIDED | none |

States: PENDIENTE, ENVIADO, RECIBIDO, VERIFICADO, BLOQUEADO — see
[external clients](../specs/methodology/dynamic-agents-external-clients.md). `DESCONOCIDO`
only when the evidence cannot choose one.

## Verified increments

Append-only. Record commands, working directory, run date, results and commit IDs.
Identify candidate, environment, delta and reasons for repeated checks. Record blocking
intervals and advance notices when relevant; tool/approval envelopes are not CPU time.
Usage requires client telemetry; missing clients/metrics remain unavailable. Do not
claim causal savings from totals.

| Date | Task | What closed | Evidence (command / candidate / PR) |
| --- | --- | --- | --- |
| UNDECIDED | | | |

## Decisions
Link to canonical guidelines; do not duplicate architectural decisions.
## Errors, regressions and blockers
None assessed yet. Distinguish failed, skipped, blocked and unrun checks.
