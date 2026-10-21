---
name: dev
description: Implement an approved specification in verified increments with progress, acceptance mapping and appropriate visual checks.
---

# dev

## Inputs
Read `AGENTS.md`, `specs/README.md`, existing state and applicable guidelines before acting.
## Outputs
Working increments, `specs/{nr}-{slug}-progress.md`, `specs/{nr}-{slug}-testplan.md`,
verified acceptance evidence, relevant documentation updates and local commits.
## Procedure
1. Locate the requested two-digit specification; ask if ambiguous. Read its approval,
   brainstorming, roadmap and applicable guidelines. Inspect code and Git status.
   Review acceptance checks and identify contradictions; stop on important conflicts.
2. Start/resume progress and test plan using their templates. Create coherent tasks and
   map every acceptance ID to an automated/manual check, expected result, command and
   evidence location. Preserve previous evidence with run dates and label stale results.
   Separate executable checks for this delivery from reviewed contracts for future deliveries;
   identify partial coverage and missing integrations without claiming future behavior tested.
   Use the approved scope; never relabel a failed or unrun current check as a future contract.
3. Implement small working increments. Maintain task state, relevant errors and next
   action. Run relevant automated tests and required build/type/lint checks. Inspect
   errors and regressions, correct defects and repeat affected checks.
   If demo/test fixtures initialize automatically, verify their environment boundary and
   rejection without changing existing data outside that boundary. Keep credentials and
   authentication artifacts out of shared logs, screenshots and other evidence.
4. Verify actual functionality, not just compilation or a process/port. For non-visual
   applications assert API/CLI/library/integration behavior and error cases.
5. For web applications operate all browser acceptance flows using Playwright; run
   complementary regression tests where useful. Capture screenshots at viewport widths
   390px and 1440px, record paths and inspect both. Review spacing, hierarchy, readability,
   accessibility and responsiveness. Identify the five most valuable visual improvements
   (or explain why fewer are justified); apply justified in-scope corrections and repeat
   affected browser/screenshot checks. Record findings and evidence in the test plan.
   Check actual foreground/background contrast; document necessary accessibility exceptions
   without redesigning approved visuals. Use stable accessible control names and wait for
   asynchronous states/transitions to settle before asserting their final presentation.
   If Playwright/browser capability is missing, install supported tooling or report a
   blocker; do not silently substitute screenshots or claim browser checks passed.
6. Update architecture when confirmed boundaries change; obtain approval before material
   deviations. Update progress/test results and documentation. Review own diff and staged
   files for regressions, secrets and unrelated changes, then commit each working increment.
   Follow the repository's Git/GitHub policy in AGENTS.md, including merge authorization.
   Tie remote CI evidence to its commit SHA; distinguish local results from remote status.
   Keep implemented, approved and integrated states distinct; mark integration complete only
   after verifying the merge.
7. Finish only when acceptance checks for the current delivery (automated or manual)
   and required regression checks pass with current evidence. Record reviewed future contracts
   separately; their implementation and integration remain pending. Summarize commands/results, commits,
   limitations and next authorized action; do not advance the roadmap by implication.
## Stop conditions
Never deploy to production, publish or perform destructive operations without explicit
permission. Stop on important conflicts or missing required authorization. Record blockers;
failed, skipped and unrun checks remain open. Do not finish as complete while acceptance
checks fail. Preserve enough progress to resume in another session.
