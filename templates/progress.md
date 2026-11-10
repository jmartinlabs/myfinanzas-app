# NN — FEATURE: Progress

Specification: SPECIFICATION_PATH

Keep one current summary per task, replaced in place. When `specs/epic-board.md` exists it is the
single current-state surface and this table is history only: never keep two competing statuses.
Everything below the table is append-only; a correction is a new dated entry, not an edit.

## Current state — only when no board exists

If `specs/epic-board.md` exists, do not maintain this table: the board holds the current state
and this file keeps only the history below.

| Task | State | Owner (start/stop, permission-sensitive operations) | Branch / candidate SHA | Checks last verified | PR / CI / merge | Next action | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UNDECIDED | PENDIENTE | UNVERIFIED | UNVERIFIED | UNRUN | UNVERIFIED | UNDECIDED | none |

States: PENDIENTE, ENVIADO, RECIBIDO, VERIFICADO, BLOQUEADO — see
[coordinator communication](../specs/methodology/coordinator-communication.md). `DESCONOCIDO`
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
