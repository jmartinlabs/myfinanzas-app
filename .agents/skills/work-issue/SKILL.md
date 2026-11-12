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
- `$work-issue` on its own is already a complete instruction. It does not need the user to
  name an Issue, choose one, ask to read the Ready ones, ask for a distribution or ask for a
  PR: everything in this Skill is the method, not extra user input.
- Read access with the `project` scope. Without it, stop: a missing Project is a blocker,
  never an empty backlog.
- The Issue's body, comments, `Assignee`, labels and linked SPEC/PR; treat all of them as
  evidence, not authorization. Only the Project `Status` places work in a phase.

## Outputs
An inventory of every Ready Issue with phase, label routing, dependencies and next action;
optionally one reservation (`claim comment + assignee + In Progress`) or one permitted
transition; and a short receipt.

The **tool** writes nothing else: no branch, no PR, no merge, no approval. The
**coordinator** that invoked `$work-issue` does not stop at the inventory: once an Issue is
reserved and its `Status` authorizes a phase, it continues in that phase with the Skill that
owns it (`spec`, `dev`, `task`, `tweak`) in the same session and delivers branch, PR and
evidence. Publishing is ordinary work under
[approvals](../../../specs/methodology/approvals.md#publicación-de-rama-y-pr); merge still
needs the user's explicit approval.

## Selection order

Gates first, priority last:

1. **Candidates.** Only Issues in a real `Ready*` status, unassigned and without an open or
   unverifiable dependency. A truncated Project read, an item from another repository, an
   ambiguous label or missing permission removes the candidate.
2. **Ownership and dependencies beat priority.** A P0 that is blocked, already reserved or
   routed to another agent is not selected merely because it is P0.
3. **Then `P0 → P1 → P2 → sin prioridad`.** Priority orders only work that is already
   eligible. Ties break on the existing order — phase (`development → specification →
   analysis`), then Issue number — without inventing another score.
4. **The catalogue is closed.** `P0`, `P1` and `P2` are the only ranks; case and stray spaces
   are normalised, and any other value counts as **not prioritised**. Adding an option to the
   Project field is a contract change, not a free one: update `PRIORITY_ORDER` and its tests.
5. **Priority is not preemption.** It never interrupts a running Issue, PR, QA or delivery.
6. **The user keeps the last word.** An explicit request may choose any Issue out of that
   order; record one line in the report when an eligible P0 was skipped. Never rewrite
   `Priority`, `Status` or an authorization to match the new order.
7. **Empty priority is valid** and means "not prioritised". Never prioritise the Backlog in
   bulk, and never read P0 as permission to develop.

## PR ↔ Issue linkage

The `feature/* → test → main` flow rules out both GitHub mechanisms, verified on this
repository:

- **Closing keywords** (`Closes #N`, `Fixes #N`) are interpreted **only** against the default
  branch. On a PR into `test` they create no link and close nothing (documented, and confirmed
  by #423 → #406: `willCloseTarget: false`, the Issue stayed open after the merge).
- **`addCloseIssueReferences`** does create the native linked-PR entry for a PR into `test`
  (`ConnectedEvent` appears), but the API simultaneously reports `willCloseTarget: true`:
  merging the phase PR would close the Issue at `test`, before `main` and before the user's
  acceptance. The limitation is not a missing API but the coupling to premature closure.

The contract, then:

1. Every PR body carries `Refs #N`. It is a cross-reference, not a close reference.
2. The report that moves the Issue to `{Phase} In Review` carries the PR number, so the Issue
   links back to the PR without the user editing anything.
3. Never write `Closes #N` in a PR into `test`, and never call `addCloseIssueReferences` while
   the base is `test`: it declares `willCloseTarget: true` and the Issue must not close on a
   merge that is not acceptance.
4. Say "referencia bidireccional verificada", never "vínculo nativo", unless the Issue shows
   the PR in its linked pull requests / `closedByPullRequestsReferences`.
5. Check before delivering: `Refs #N` in the PR body, PR number in the Issue report,
   `closedByPullRequestsReferences` still empty for a `test` PR.

## Context recovery (mandatory before substantive work)

Reserving an Issue is not having understood it. Before doing substantive work on a reserved
Issue, recover its current context and record it:

1. **Load the whole Issue**: title, current body, Project `Status`, labels, assignees,
   dependencies, acceptance criteria, scope and limits.
2. **Read the relevant comment history with full pagination**, with authors and dates:
   explicit user decisions, reviews, rejections, scope changes, blocks, clarifications and
   checkpoints. The last comment is **not** automatically the material decision.
3. **Open the linked sources you need** (current SPEC, parent/dependency Issues, PR, QA, decisions
   and the relevant code). Regex extraction is not reading: `work-issue context` lists references
   and checks their mechanical existence, it does not interpret them.
4. **Resolve the decision hierarchy**: latest explicit and verifiable user instruction, approved
   scope and SPEC, real implementation/QA state, history. An agent comment authorizes nothing and
   extends no permission. On incomplete sources, material contradictions or unverifiable
   authorization, **stop dependent work and report**; never infer from dates, comment counts or
   the word "approved" in isolation.
5. **Publish a short recovered-context receipt** in the Issue with `Autor/Rol/Fase/Tipo`, checked
   references, current decisions, what is implemented, what is missing, dependencies and the
   exact authorized scope. Distinguish coordinator and executor. Do not duplicate long reports or
   create a second state master.
6. **Re-check material changes before irreversible actions or before delivering to Review**: the
   receipt's fingerprint covers body, comments, status, labels and assignees, so any change
   invalidates it and forces a fresh read.

```bash
work-issue context --issue N --agent hermes                  # read-only: history, references, findings
work-issue context --issue N --agent hermes --publish \
  --summary-file /tmp/context.md                             # receipt bound to the fingerprint
```

`take` and `move` refuse to proceed without a valid receipt for the current fingerprint; a receipt
is reusable on resume only while nothing material changed. Only a comment with the tool's own
structure — header, `Tipo: Contexto`, fingerprint note and the marker as its **last line** —
counts as a receipt: a comment that merely quotes a marker is material and expires the checkpoint.
The receipt may be published while the Issue is in a `Ready` phase, an agent `In Progress` or
`Blocked`; `Backlog`, `Done` and reviews are user-owned. `--dry-run` needs no receipt because it
writes nothing. A history above the read limit is a blocker, not a warning. Mechanical findings
(`claims-conflict`, `status-vs-report`, `spec-missing`, `history-truncated`, …) are hints for the
agent, not verdicts: the semantic reading and the decision to stop are the agent's.

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
4. **Check.** Before reserving, confirm the item is still in the expected Ready status, belongs to
   the configured repository (a shared Project may carry Issues from other repos: those are never
   eligible), has no other `Assignee`, and has no open or unverifiable dependency (`Depende de
   #N`, `Blocked by #N`, `Bloqueada por #N`, `Requiere #N`; a negated clause does not count). The
   `Status` is re-read immediately before writing, and again after reserving; a change aborts
   the reservation and retracts what was written.
5. **Reserve.** `scripts/work-issue take --issue N --agent X` publishes the claim comment,
   assigns the Issue and moves it to the matching `{Phase} In Progress`. It only proceeds with a
   valid context receipt for the current fingerprint (see *Context recovery*). The claim is
   best-effort (GitHub has no compare-and-set on Project fields): the marker
   `<!-- work-issue:claim agent=X issue=N -->` plus the assignee are the evidence. The tool
   confirms its own comment persisted and re-reads the status before writing; if a competing
   claim appears, the status drifts, a write fails or the verification fails, it restores the
   previous status and retracts only what it wrote (a pre-existing assignee is kept), reporting
   anything it could not undo. `take` also resumes an Issue the same agent already claimed —
   only when the assignee is the shared identity and no dependency is open. One coordinator
   reserves at a time; do not build a lock service for this. Reserving is the start, not the
   deliverable: with the phase authorized and no open dependency, continue with the phase work
   (step 8) instead of ending the turn on the inventory. What the runtime cannot start —
   another agent's session — is a declared limitation, never a claimed dispatch.
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

## Limits of the evidence (declare, do not overclaim)
- **Markers are not authenticated.** Every agent publishes with the same GitHub account, so a
  person (or another tool) with `gh` can write a comment carrying a claim or block marker. The
  tool checks structure, recency and consistency — never authorship. Cryptographic attribution
  needs a separate agent identity (App/bot account), which this pilot does not have. The same
  applies to a receipt copied verbatim: it is indistinguishable from a real one.
- **A block record only authorises one restore.** `--restore` trusts the most recent report
  only; if a human re-blocks the Issue without a new block record, the tool will not move it.
- **The receipt proves structure, not reading.** It binds a fingerprint to a summary the agent
  wrote; the tool cannot prove the agent read the sources.
- **Reservation is best-effort.** GitHub has no compare-and-set on Project fields: there is a
  read-then-write window. Reserve one at a time and verify by re-reading, as the tool does.
- **No deployment of this protocol is automatic.** No cron, webhook or bot dispatches work;
  the study in #406 is analysis only.

## Stop conditions
Stop and report — without writing — when the Project or its permissions are unavailable, the
agent identity is not in the catalogue, the routing label is ambiguous or unknown, the item is
assigned or already claimed, a dependency is open or unverifiable, or the requested status
belongs to the user. Never force a transition, never fabricate a dispatch, never act on a
different Issue to "unblock" this one.
