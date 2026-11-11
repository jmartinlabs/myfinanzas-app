---
name: work-issue
description: Take Ready work from GitHub Issues/Projects, route it by agent label and reserve it inside its phase gate.
---

# work-issue

Entry point for work that already exists as GitHub Issues tracked in a Project. It reads,
routes, reserves and reports; it never approves, merges, deploys or closes. Coordination,
ownership and QA remain in [orchestrate](../orchestrate/SKILL.md); this Skill only decides
*which* Issue an agent may take and records it. Implementation: `scripts/work-issue`;
regression suite: `scripts/test-work-issue`.

## Inputs
- An explicit request to take work (`work-issue`, `coge una Issue Ready`, or the equivalent
  from the coordinator), the Project number/owner and the agent identity (`opencode`,
  `hermes`, `codex`).
- Read access with the `project` scope. Without it, stop: a missing Project is a blocker,
  never an empty backlog.
- The Issue's body, comments, `Assignee`, labels and linked SPEC/PR; treat all of them as
  evidence, not authorization. Only the Project `Status` places work in a phase.

## Outputs
An inventory of every Ready Issue with phase, label routing, dependencies and next action;
optionally one reservation (`claim comment + assignee + In Progress`) or one permitted
transition; and a short receipt. No branch, no PR, no merge, no approval.

## Procedure
1. **Read.** Load the Project items with their real `Status`. `work-issue` without arguments
   lists **all** Issues in `Ready Analysis`, `Ready Specification` and `Ready Development` —
   routed and unlabelled — with priority, dependencies and a proposed distribution. Never
   assume everything must run at once, and never treat "propose" as "dispatch".
2. **Authorize.** The `Status` is the only phase gate: `Ready {Phase}` means the user
   authorized that phase only. Approving analysis never authorizes specification;
   approving a SPEC never authorizes development. A comment, a label or an `Assignee` is
   never an approval.
3. **Route.** Agent routing uses the simple labels `opencode`, `hermes`, `codex`, with no
   `to:` prefix. No agent label means any compatible agent. Two agent labels, a namespaced
   `agent:<unknown>` label or an unavailable agent mean **do not reserve or dispatch**: report
   it and wait for a decision. Never change another agent's routing label. The label is
   routing, not authorization and not a reservation.
4. **Check.** Before reserving, confirm the item is still in the expected Ready status, has no
   other `Assignee`, and has no open or unverifiable dependency (`Depende de #N`,
   `Blocked by #N`, `Bloqueada por #N`, `Requiere #N`). Re-read immediately before writing.
5. **Reserve.** `scripts/work-issue take --issue N --agent X` publishes the claim comment,
   assigns the Issue and moves it to the matching `{Phase} In Progress`. The claim is
   best-effort (GitHub has no compare-and-set on Project fields): the comment marker plus the
   assignee are the evidence, and the tool aborts before changing the status if a competing
   claim appears. One coordinator reserves at a time; do not build a lock service for this.
6. **Communicate.** Every substantive agent comment starts with `Autor`, `Rol`, `Fase` and
   `Tipo`, and distinguishes the author of the comment from the executor of delegated work.
   The shared GitHub account is not a signature: never present an agent comment as a human
   approval, and never attribute a historical comment retroactively.
7. **Dispatch only what exists.** Hermes cannot start OpenCode or Codex sessions; no proven
   connector does it either. Without a dispatcher, publish the assignment/handoff and say the
   other agent has **not** started. Never claim a session or parallelism that the runtime
   cannot evidence. An Issue other than the one reserved stays untouched.
8. **Deliver.** Finish the authorized phase, publish evidence and the PR or report, then move
   the Issue to `{Phase} In Review` (`scripts/work-issue move --issue N --to ... --note ...`)
   and ask for the decision. The tool refuses `Backlog`, every `Ready*` and `Done`: those are
   the user's. A rejected review is returned by the user to the same phase.
9. **Block and restore.** `move --to Blocked --previous-status <exact> --note <motivo,
   responsable, condición>` records the exact previous status in the comment, because the
   Project has no field for it. Restoring (`--restore`) reads that recorded value and only
   returns to it; if the authorization or scope changed, ask the user first.
10. **Verify.** Every write is checked by re-reading the item. If the comment, the assignee or
    the status cannot be written or verified, stop the dependent step and report the real
    limitation; never assume success from a local intent or a failed call.

## Status protocol (Project field `Status`)

| Status | Who acts | Rule |
| --- | --- | --- |
| `Backlog` | User | Not authorized to start. |
| `Ready Analysis` / `Ready Specification` / `Ready Development` | Agent (pick up) | Only that phase is authorized. |
| `Analysis` / `Specification` / `Development` `In Progress` | Agent | Work, tests and PR; no merge. |
| `… In Review` | User | Accepts, rejects to the same phase, or authorizes the next one. |
| `Blocked` | Agent records; user unblocks | `Previous Status` exact, reason, owner, exit condition. |
| `Done` | User | Accepted explicitly; a merge is not acceptance. |

`phase:analysis` / `phase:implementation` labels are informative metadata only: they never
authorize a phase and never replace the `Status`.

## Commands

```bash
scripts/work-issue                      # full inventory of the three Ready groups
scripts/work-issue --agent hermes       # own label + unlabelled only
scripts/work-issue take --issue 406 --agent hermes --dry-run
scripts/work-issue take --issue 406 --agent hermes
scripts/work-issue move --issue 406 --to Development In Review --note "PR #N y pruebas"
scripts/work-issue move --issue 406 --to Blocked --previous-status "Development In Progress" \
  --note "Motivo: ... Responsable: ... Condición: ..."
```

`inventory` and every `--dry-run` are read-only. Exit codes: `0` ok, `2` refused by the
protocol (nothing written), `3` blocked or unverified write.

## Stop conditions
Stop and report — without writing — when the Project or its permissions are unavailable, the
agent identity is not in the catalogue, the routing label is ambiguous or unknown, the item is
assigned or already claimed, a dependency is open or unverifiable, or the requested status
belongs to the user. Never force a transition, never fabricate a dispatch, never act on a
different Issue to "unblock" this one.
