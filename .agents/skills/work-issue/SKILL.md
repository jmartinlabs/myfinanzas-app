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
1. **Read.** Load the Project items with their real `Status`, priority, declared dependencies
   and the Épica/SPEC/Issue references already present in the body. `work-issue` without
   arguments lists **all** Issues in `Ready Analysis`, `Ready Specification` and
   `Ready Development` — routed and unlabelled — with a proposed distribution. Never assume
   everything must run at once, and never treat "propose" as "dispatch". A truncated Project
   reading is reported and cannot be reserved from.
2. **Authorize.** The `Status` is the only phase gate: `Ready {Phase}` means the user
   authorized that phase only. Approving analysis never authorizes specification;
   approving a SPEC never authorizes development. A comment, a label or an `Assignee` is
   never an approval.
3. **Route.** Agent routing uses the simple labels `opencode`, `hermes`, `codex`, with no
   `to:` prefix. Namespaced `agent:X` and `to:X` are accepted for the same catalogue and fail
   closed when X is unknown. No agent label means any compatible agent. Two agent labels, a
   namespaced label outside the catalogue or an unavailable agent mean **do not reserve or
   dispatch**: report it and wait for a decision. Never change another agent's routing label.
   The label is routing, not authorization and not a reservation.
4. **Check.** Before reserving, confirm the item is still in the expected Ready status, has no
   other `Assignee`, and has no open or unverifiable dependency (`Depende de #N`,
   `Blocked by #N`, `Bloqueada por #N`, `Requiere #N`; a negated clause does not count). The
   `Status` is re-read immediately before writing, and again after reserving; a change aborts
   the reservation and retracts what was written.
5. **Reserve.** `scripts/work-issue take --issue N --agent X` publishes the claim comment,
   assigns the Issue and moves it to the matching `{Phase} In Progress`. The claim is
   best-effort (GitHub has no compare-and-set on Project fields): the marker
   `<!-- work-issue:claim agent=X issue=N -->` plus the assignee are the evidence. The tool
   confirms its own comment persisted and re-reads the status before writing; if a competing
   claim appears, the status drifts, a write fails or the verification fails, it restores the
   previous status and retracts only what it wrote (a pre-existing assignee is kept), reporting
   anything it could not undo. `take` also resumes an Issue the same agent already claimed —
   only when the assignee is the shared identity and no dependency is open. One coordinator
   reserves at a time; do not build a lock service for this.
6. **Communicate.** Every substantive agent comment starts with `Autor`, `Rol`, `Fase` and
   `Tipo`, and distinguishes the author of the comment from the executor of delegated work
   (`--executor`). Option flags are accepted on either side of the subcommand. The shared
   GitHub account is not a signature: never present an agent comment as a human approval, and
   never attribute a historical comment retroactively.
7. **Dispatch only what exists.** Hermes cannot start OpenCode or Codex sessions; no proven
   connector does it either. Without a dispatcher, publish the assignment/handoff and say the
   other agent has **not** started. Never claim a session or parallelism that the runtime
   cannot evidence. An Issue other than the one reserved stays untouched.
8. **Deliver.** Finish the authorized phase, publish evidence and the PR or report, then move
   the Issue to `{Phase} In Review` (`scripts/work-issue move --issue N --to ... --note ...`)
   and ask for the decision. `move` requires the claim published by the calling agent, matched
   exactly against that marker, and never performs the initial reservation: `Ready*` only moves
   through `take`. The tool refuses `Backlog`, every `Ready*` and `Done`: those are the user's.
   A rejected review is returned by the user to the same phase.
9. **Block and restore.** `move --to Blocked --previous-status <exact current>` only works from
   the agent's own `{Phase} In Progress` and records the transition inside a delimited record
   (`<!-- work-issue:record -->`), together with `Tipo: Bloqueo` and
   `<!-- work-issue:block agent=X issue=N -->`. Free text (`--note`, `--executor`) has HTML
   comments removed and cannot reproduce a structural line, so it can never impersonate the
   record. `--previous-status` is rejected outside a block. `--restore` only works on a
   `Blocked` Issue, only trusts a complete record, and only returns to an agent
   `{Phase} In Progress` status whose `De` line matches the recorded one. If the authorization
   or scope changed, ask the user first.
10. **Verify.** Every write is checked by re-reading the item. A failed write or verification
    is undone as far as possible (including the published report comment) and the rest is
    reported as a pending write; never assume success from a local intent or a failed call.
    Argument validation happens before any GitHub access, so a malformed command never depends
    on credentials.

## Status protocol (Project field `Status`)

| Status | Who acts | Rule |
| --- | --- | --- |
| `Backlog` | User | Not authorized to start. |
| `Ready Analysis` / `Ready Specification` / `Ready Development` | Agent (pick up) | Only that phase is authorized. |
| `Analysis` / `Specification` / `Development` `In Progress` | Agent | Work, tests and PR; no merge. |
| `… In Review` | User | Accepts, rejects to the same phase, or authorizes the next one. |
| `Blocked` | Agent records (only from its own `{Phase} In Progress`); user unblocks | `Previous Status` exact, reason, owner, exit condition. |
| `Done` | User | Accepted explicitly; a merge is not acceptance. |

`phase:analysis` / `phase:implementation` labels are informative metadata only: they never
authorize a phase and never replace the `Status`.

## Commands

```bash
scripts/work-issue                      # full inventory of the three Ready groups
scripts/work-issue --agent hermes       # own label + unlabelled only
scripts/work-issue take --issue 406 --agent hermes --dry-run
scripts/work-issue take --issue 406 --agent hermes
scripts/work-issue move --issue 406 --agent hermes --to "Development In Review" --note "PR #N y pruebas"
scripts/work-issue move --issue 406 --agent hermes --to Blocked \
  --previous-status "Development In Progress" \
  --note "Motivo: ... Responsable: ... Condición: ..."
scripts/work-issue move --issue 406 --agent hermes --restore   # vuelve al Previous Status registrado
```

`inventory` and every `--dry-run` are read-only. `take`/`move` require `--agent`; without it the
tool refuses with exit `2` before touching GitHub. `move` requires the claim published by `take`.
Exit codes: `0` ok, `2` refused by the protocol (nothing changed, or the tool's own writes were
retracted), `3` blocked or failed write — the receipt lists any write that could not be undone.

## Stop conditions
Stop and report — without writing — when the Project or its permissions are unavailable, the
agent identity is not in the catalogue, the routing label is ambiguous or unknown, the item is
assigned or already claimed, a dependency is open or unverifiable, or the requested status
belongs to the user. Never force a transition, never fabricate a dispatch, never act on a
different Issue to "unblock" this one.
