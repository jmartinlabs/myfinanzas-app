# B3 parent-state contrast — diagnostic only

User authorized this bounded contrast with «sigue»,2026-10-26. Product candidate
PR75 b7bcbb6; no product, canonical tests or validate.yml edits. Not for merge.

Prior evidence: parent/fresh-process initialization/read matrix on feb3e2d had
16/16 successful cases; B1/B2 sequence comparison had12/12. PR76 single capture
was inconclusive: instrumented219/219 API, normal218/219 with B3/522. Repeating
those probes without a new measurement would not establish a cause.

Hypothesis under test: preceding suite tests leave observable parent state
(SQLite method spies, allowlisted environment, umask, SQLite-related fd counts)
different from the isolated context at B3 boundaries. It is not assumed true.
No hypothetical state is repaired during this experiment.

The preload registers beforeEach/afterEach and stores function identity/source
hashes, mock shape, hashed allowlisted environment, umask and fd counts only.
It does not call SQLite, wrap query methods, read WAL/SHM or spawn helpers.
Directory/link reads in /proc expose counts only, never path contents. Hooks
add small work/I/O and are not timing-neutral. They observe test boundaries,
not every statement inside B3; native state remains outside their coverage.

Two predeclared executions in fresh Bun processes, each at most600s:
1. Canonical B3 test selected from sqlite-opening.test.ts.
2. Whole API suite with the same preload; no B3 filtering or assertion changes.

No retries. Stop early on timeout or invalid boundary capture. If no B3 failure,
return INCONCLUSIVE and stop. Differences between contexts support further
analysis only; identical observed state does not exclude native SQLite/Bun
state or filesystem effects. Correlation uses the canonical B3 result line
and the immediately preceding completed boundary pair. Ambiguity invalidates
the capture. Suite errors remain errors; no acceptance verdict is substituted.

Workflow added only for opening this diagnostic PR into codex/dev14-base-b,
no synchronize trigger or merge intention. Normal CI remains independent.
JSON/JSONL technical artifacts only, seven days. No DB, rows, SQL, keys or full
function source. No deployment, Dev32, D5 or real-data operations.
