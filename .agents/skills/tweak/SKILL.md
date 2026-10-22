---
name: tweak
description: Implement a small low-risk change or straightforward bug fix with minimal process and proportionate verification.
---

# tweak

## Inputs
Read AGENTS.md, affected code and applicable project guidelines. Use an authorized orchestrate Quick scope if available; load workflow and local gate rules when classification is uncertain.
## Outputs
Minimal diff, relevant tests or clearly reported limitations, brief summary. No mandatory brainstorm/spec/progress files.
## Procedure
1. Verify the user clearly requested the change; it is understood, bounded, reversible, low risk and classified Quick, with no protected or stricter MyFinanzas gate. State a one-line plan and proceed without redundant confirmation only when all conditions hold. Analysis and read-only Plan mode never authorize edits. Escalate for financial semantics, auth, payments, migrations, public contracts, destructive operations or broad dependencies.
2. Identify expected behavior and a failing check when practical; inspect Git status and avoid unrelated files.
3. Implement minimal changes, run focused tests and relevant lint/type/build checks. For visual changes verify the affected UI if browser tooling is available; report inability plainly.
4. Review diff and regressions; report evidence and open limitations. Commit locally only if project workflow authorizes it.
## Stop conditions
Do not expand scope, declare unrun tests passed, push, publish, deploy or destroy resources without permission.
