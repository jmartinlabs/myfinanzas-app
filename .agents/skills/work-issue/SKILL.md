---
name: work-issue
description: Take authorized work from Issues and an optional GitHub Project, route it by agent label and reserve it inside its phase gate.
---

# work-issue

Entry point for work that already exists as Issues, optionally tracked in a GitHub Project. It
reads, routes, reserves and reports; it never approves, merges, deploys or closes. The
canonical contract — two entry paths, the 12 statuses, owners, manual protocol, routing,
communication and PR linkage — is [the issue workflow](../../../specs/methodology/issue-workflow.md).
Coordination, ownership and QA stay in [orchestrate](../orchestrate/SKILL.md); this Skill only
decides *which* Issue an agent may take and how the session records it.

## Skill and tool

- **`$work-issue` (this Skill)** is the *procedure*: when an Issue may be taken, in which order,
  what evidence must be published, how the session continues across Issues and when it ends. It
  is not a program and does nothing by itself: it runs only inside an agent that reads it and
  follows it.
- **`scripts/work-issue`** is the *command-line tool* the procedure uses for the mechanical
  part: `inventory`, `next`, `context`, `take` and `move`. It creates no branch, PR, merge or
  approval, executes no phase and has **no session or memory of its own between calls**.
- Therefore `@work-issue opencode` asks the **agent** to run a session over that agent's queue;
  `scripts/work-issue next --agent opencode` is one read-only call inside that session. The tool
  needs `--agent` because it cannot carry a session.
- The core decisions (eligibility, ordering, transitions, receipts) live in the tool
  independently of its GitHub adapter, so another tracker adapts the protocol without a new
  state engine.

## Inputs

- An explicit request to take work (`work-issue`, `@work-issue opencode`, "take a Ready Issue",
  or the coordinator's equivalent), the repository (`--repo OWNER/NAME`), optionally the Project
  (`--project N`, `--owner ORG`) and the agent identity (`opencode`, `hermes`, `codex`, `claude`). Naming
  the agent names the queue the session works until it is exhausted.
- **Identity per client:** Claude Code is `claude`, Codex is `codex`, Hermes is `hermes` and
  OpenCode is `opencode`; pass it as `--agent` on every `scripts/work-issue` call that takes or
  moves an Issue. The identity is the client actually running, never another agent's.
- **No agent named:** the session uses that client identity and works the Issues without an
  agent label plus those labelled for it. Another agent's Issues are reported, never taken.
- `$work-issue` on its own is already a complete instruction: the user does not need to pick an
  Issue, ask for the inventory or ask for a PR. Everything here is the method.
- Configuration is explicit and **never guessed**. When the checkout declares its tracker in
  `.agents/tracker.local.yaml` — local, never committed — its `repo`, `owner` and `project` are
  the only valid pair for that checkout and are passed explicitly on every call. Otherwise
  resolve `--repo` from the current checkout
  (repository, remote or the project's documented tracker) and the Project number from the
  project context; ask only when either is missing or ambiguous. Never assume a specific
  repository, owner, Project number or priority.
- Read access with the `project` scope when a Project is used. Without it, stop: a missing or
  unreadable Project is a blocker, never an empty backlog.
- The Issue body, comments, labels and linked SPEC/PR: all of them are evidence, not
  authorization. Only the Project `Status`, or the human authorization recorded in the Issue
  when there is no Project, places work in a phase.

## Outputs

An inventory of every Ready Issue with phase, routing, dependencies and next action; one
reservation per Issue the session works (claim comment + `In Progress`), its context
receipt and the transitions each phase permits; and a short session ledger. The **tool** writes
nothing else: no branch, no PR, no merge, no approval. Operational comments keep the protocol
header (`Autor`, `Rol`, `Fase`, `Tipo`, optional `Ejecutor`) and the `- De:` / `- A:` record;
their markers belong on the last line and are never quoted as evidence.

## Procedure

0. **Load the coordinator.** Follow [orchestrate](../orchestrate/SKILL.md): classification,
   routing and approval gates. `work-issue` never authorizes a phase, approves a SPEC or emits a
   PR; without verified authorization the session stops at the empty queue.
1. **Read.** Load the Project items, or the identified Issue, with their real state, priority,
   declared dependencies and Epic/SPEC/PR references. Without arguments, list **all** Issues in
   `Ready Analysis`, `Ready Specification` and `Ready Development` with a proposed distribution;
   `next --agent X` reduces that to one queue in work order. Never treat "propose" as
   "dispatch", and never consume a truncated reading.
2. **Authorize.** `Ready {Phase}` authorizes that phase only. A comment or label is
   never an approval. **Only when no Project is configured**, use the manual protocol: the
   Issue must carry the identifiable human authorization for the requested phase before any
   reservation, and the agent neither invents statuses nor writes one. A Project that exists
   but cannot be read is a blocker whose `Status` remains the gate; an Issue comment never
   substitutes for `Ready {Phase}`.
3. **Route.** Canonical label `agent:X` (bare `X` is an alias) over the catalogue `opencode`,
   `hermes`, `codex`, `claude` (replaceable with `agents:` in `.agents/tracker.local.yaml`);
   `agent:X` fails closed outside the catalogue; no label means any compatible agent; two labels or an unknown
   agent mean report and wait. Never change another agent's routing label.
4. **Check.** With a Project, confirm the Issue is still `Ready`, belongs to the configured
   repository, has no other agent's claim and no open or unverifiable dependency (`Depends on #N`,
   `Blocked by #N`, `Depende de #N`, `Bloqueada por #N`; a negated clause does not count). The
   dependency is resolved in this repository only: a same-numbered Issue in another repository
   never satisfies it, and a qualified `owner/repo#N` reference fails closed as unverifiable.
   Without a Project there is no `Ready` status, fingerprint or CLI receipt
   to re-read: confirm instead the human authorization, scope, ownership and dependencies
   recorded in the Issue.
5. **Recover context and reserve.** With a Project, read the whole history, the linked sources
   and the decision hierarchy; publish a receipt bound to the current fingerprint ([context
   receipt](#context-receipt)). Then `take`, which re-reads the Status, publishes the claim
   and moves to `{Phase} In Progress`, and retracts its own writes on drift, collision
   or failed verification. Without a Project, publish the start comment with the protocol
   header (`Autor`, `Rol`, `Fase`, `Tipo: Inicio`, optional `Ejecutor`), and
   re-read it: that comment is the reservation, and no CLI receipt or
   fingerprint is required. The claim is best-effort evidence, not a lock:
   one reservation at a time, and never a lock service.
6. **Execute.** Continue with the Skill that owns the phase (`spec`, `dev`, `task`, `tweak`) and
   deliver the branch, PR and evidence. Reserving is the start, not the deliverable.
7. **Deliver and continue.** Publish the report or PR. With a Project, `move` into `{Phase} In
   Review`; without one, record the report and an explicit review request without writing a
   Status. `move` re-reads the Status and the claims before writing: while
   another agent's claim exists it refuses and writes nothing. Then
   return to the queue for the next eligible Issue instead of waiting for that decision. Never
   claim a session, a parallel worker or a dispatch the runtime cannot evidence.
8. **Block and restore.** Block only from your own `{Phase} In Progress`, recording `Previous
   Status`, reason, owner, exit condition and date. Restore only with `--restore`, only to the
   recorded agent status, and only while the permission still holds; otherwise ask the user.
9. **Verify.** Every write is re-read; a failed write or verification is undone as far as
   possible and the rest is reported as a pending write. Argument validation happens before any
   GitHub access.

## Context receipt

The canonical contract is [the context receipt section](../../../specs/methodology/issue-workflow.md#context-receipt);
this is the operational way to satisfy it. Publish with the real flags:

```bash
scripts/work-issue --repo OWNER/NAME --project N context --issue N --agent hermes \
  --publish --summary-file path/to/summary.md
```

The summary file must use exactly these headings, or publication is refused:

```markdown
## Decisiones vigentes
- ...
## Estado
- ...
## Alcance autorizado
- ...
## Fuentes consultadas
- Body, comments, linked SPEC and PR.
```

Only a comment whose **last non-empty line** is the exact `<!-- work-issue:context ... -->`
marker, whose header starts with `Autor:` and `Tipo: Contexto`, and that carries the
`Huella del contexto:` line counts as a receipt. A quoted marker or a missing header/line is
material, not a receipt, and a receipt never proves the reading.

The receipt expires on **any** new comment — including the agent's own claim or report — and on
`take`, which changes Status. Publish a new receipt after `take` and before the
first `move`; a receipt from the `Ready` state authorizes nothing in `In Progress`.

## Session continuity

`@work-issue <agent>` is a **session** of that agent: one invocation keeps taking that agent's
eligible Issues in selection order until the queue is empty or a real blocker appears.
Delivering one Issue, leaving another in review or asking whether to continue never ends it.

Each round: recompute the queue (`next`), recover context and reserve, execute the authorized
phase, move to `{Phase} In Review`, add one ledger line and return to the queue. An Issue the
user returns from review re-enters in priority order and is resumed with its existing claim,
never re-claimed. Only an open dependency, another agent's ownership, a foreign repository, a
history over the read limit or a failed precondition removes an Issue — and only that Issue.

Selection order: gates first, then priority `P0 → P1 → P2 → unprioritised`; priority never
preempts running work and never overrides an ownership or dependency gate. Phase ties break
`development → specification → analysis`, then Issue number. An explicit user request may take
any Issue out of that order; record the skip in one line and never rewrite Priority or Status.

Close with one compact table — Issue, phase, result — the untouched Issues with their reason
and who must act. The ledger reports the session; it authorizes and replaces nothing.

Nothing schedules this loop: **no cron, webhook, bot or login hook**, and no queue survives the
session — the Project is the queue. Without a Project the same loop runs over the Issues the
user authorized, with the manual protocol recording each reservation and delivery.

## Stop conditions

Stop and report, without writing, when the Project or its permissions are unavailable, the
requested phase has no identifiable human authorization, the agent identity is not in the
catalogue, the routing label is ambiguous or unknown, the Issue is claimed
elsewhere, a dependency is open or unverifiable, the history exceeds the read limit, or the
requested transition belongs to the user (`Backlog`, every `Ready*`, `Done`, and any review).
Never force a transition, never fabricate a dispatch, never fall back to a local state and
never act on a different Issue to unblock this one. Stopping one Issue never stops the session.
