# Issue workflow

The portable protocol for tracking authorized work in Issues with an **optional** GitHub
Project. It extends [adaptive workflows](workflows.md) and [epic orchestration](epic-orchestration.md);
the `$work-issue` Skill is its procedure and `scripts/work-issue` is its GitHub adapter.
GitHub is not a logical requirement: another tracker implements the same states, owners and
gates instead of inventing a second state engine.

## Two entry paths

- **Project start → epics → SPEC → Issues → PR.** Initialization analyses scope, proposes
  epics, prepares the planning tickets needed to write or review each SPEC and, once a SPEC is
  approved, generates the executable Issues derived from it. Creating a ticket or an Issue
  never authorizes its execution. Small projects may skip formal epics or SPECs when the
  decision is justified and recorded.
- **Direct Issue → PR (or Issue → SPEC → PR).** Errors, CI, infrastructure, maintenance and
  bounded changes are registered as one Issue with scope and acceptance checks; uncertainty
  first needs analysis, a contractual or complex change needs an approved SPEC. Reuse the same
  Issue as the follow-up thread instead of duplicating tickets. A trivial correction needs no
  SPEC.

## Single source of operational state

- **With a Project, the Project `Status` is the only phase gate and the only operational
  queue.** It replaces `specs/epic-board.md`; the board remains only for projects without an
  external tracker. `templates/progress.md` keeps per-task evidence and progress, never a
  competing status list.
- **Without a Project, the manual protocol below applies**: phase and scope are authorized by
  an identifiable human instruction recorded in the Issue, and the reservation, delivery and
  acceptance are recorded there. No status is invented, no queue is simulated and no
  automation collects work.
- A Project that exists but cannot be read or written is a **blocker**, not a fallback: do not
  present unreadable state as an empty backlog and do not silently switch to the manual
  protocol. Offer read-only work and ask for the missing access.
- `phase:analysis` / `phase:implementation` labels are informative metadata only. No label,
  assignee or agent comment authorizes a phase. The GitHub assignee is a human field that agents
  neither read, write nor gate on; only labels route and only the claim comment reserves.

## The 12 statuses

Twelve statuses, exact names and owners. A Project configured with this model uses these
options; the harness never creates or edits Project fields.

| # | Status | Who acts | Meaning |
| --- | --- | --- | --- |
| 1 | `Backlog` | User | Registered, not authorized to start. |
| 2 | `Ready Analysis` | Agent (pick up) | Only investigation and a proposal are authorized. |
| 3 | `Analysis In Progress` | Agent | Analyses and publishes findings; no implementation. |
| 4 | `Analysis In Review` | User | Accepts, rejects, or authorizes the next phase. |
| 5 | `Ready Specification` | Agent (pick up) | Only preparing or adjusting a SPEC is authorized. |
| 6 | `Specification In Progress` | Agent | Writes requirements and acceptance checks; documentation PR only. |
| 7 | `Specification In Review` | User | Approves the SPEC or returns it for correction. |
| 8 | `Ready Development` | Agent (pick up) | Only implementation of the authorized scope. |
| 9 | `Development In Progress` | Agent | Implements, tests and opens a PR; no merge or deploy. |
| 10 | `Development In Review` | User | Reviews the diff, checks and QA; decides corrections and integration. |
| 11 | `Blocked` | Agent records; user or owner unblocks | Pending dependency or decision. |
| 12 | `Done` | User | Scope completed and accepted. |

## Ownership of transitions

- **User:** moves work into `Backlog`, into each `Ready {Phase}` after authorizing **that
  phase**, attends every `{Phase} In Review`, rejects to the same phase or authorizes the next
  one, and accepts `Done`. Approving an analysis never authorizes specification; approving a
  SPEC never authorizes development; a merge is not acceptance.
- **Agent:** takes only work already in a `Ready {Phase}`, reserves it, moves it to that
  phase's `In Progress`, works, publishes evidence and delivers into `{Phase} In Review`. It
  may declare `Blocked` from its own `{Phase} In Progress`. Delivery repeats the ownership
  gate: while another agent's claim exists, `move` refuses and writes
  nothing, and it never clears that ownership.
- **Rejected review:** the user records the observations and returns the Issue to the same
  phase's `In Progress`. The agent works only on the requested corrections; a new
  authorization is neither created nor implied.
- **Blocked:** before changing the Status, publish a comment with `Previous Status: <exact
  value>`, reason, dependency or decision, owner of the unblocking action, exit condition and
  date. On resolution, record it and restore the previous Status only while that permission
  still holds; a pending review returns to review, never to agent work. If the authorization
  expired or changed, ask the user before moving.
- **Automated restoration is bounded:** the tool restores only an agent `{Phase} In Progress`
  recorded in its own latest block record, and only once. A human-owned review, `Ready*`,
  `Backlog` or `Done` status is restored by the human who owns it.
- Approval gates stay separate: phase authorization, SPEC approval, PR/merge approval and
  promotion to the main branch are different decisions.

## Manual protocol without a Project

When no tracker is configured for the work:

1. The Issue states the requested phase, scope, acceptance checks, dependencies and the
   **identifiable human authorization** for that phase (who, what, when). An agent comment is
   never that authorization.
2. The agent publishes a start comment (identity header, phase, scope) before substantive
   work: that comment is the **reservation**; announce it and re-read the
   Issue before writing.
3. Work stays inside the authorized phase; findings, blockers and questions are recorded in
   the Issue. Dependencies and ownership are checked exactly as with a Project.
4. Delivery is a report, a SPEC or a PR with evidence, plus an explicit request for review.
   The action then passes to the user.
5. `Blocked` keeps its `Previous Status`, reason, owner and exit condition in the Issue.
6. Acceptance and closure are human. Nothing is "Done" because work was delivered or merged.

The manual protocol applies **only when no Project is configured** for this work. If a Project
exists but cannot be read or written, the Project `Status` remains the gate: stop and report
the blocker, ask for the missing access and do not switch to the manual protocol. A comment,
label, assignee or Issue-level phase request never substitutes for `Ready {Phase}` while a
Project owns the status. Do not rebuild the protocol as a new state machine or as a second
board.

## Taking one Issue

1. **Discover.** Read the Project or the identified Issue: body, recent comments, linked SPEC
   and PR, dependencies and real state. `work-issue` without arguments lists every
   Issue in the three `Ready` groups with a proposed distribution; `next --agent X` reduces it
   to that agent's queue.
2. **Verify.** With a Project, require the specific `Ready` status; without one, require the
   human authorization recorded in the Issue. In both cases require sufficient scope, ownership
   and no open dependency. A dependency number resolves only in this repository; a qualified
   `owner/repo#N` reference is not supported and fails closed as unverifiable. An agent never
   creates permission by moving the Status itself.
3. **Recover context.** Read the whole history with pagination, the linked sources and the
   decision hierarchy (latest explicit user instruction, approved scope, real state). Publish
   a short receipt bound to a fingerprint ([context receipt](#context-receipt)); on material
   contradiction or unverifiable authorization, stop dependent work and report.
4. **Reserve.** With a Project, re-read the Status, confirm no other claim, publish
   the claim comment and move to `{Phase} In Progress`; re-read afterwards and retract
   the writes on drift. Without one, publish the start comment and re-read it.
   Reservation is best-effort (GitHub has no compare-and-set): one reservation at a time, never
   a lock service.
5. **Execute** the authorized phase with the Skill that owns it (`orchestrate`, `spec`, `dev`,
   `task`, `tweak`) and deliver the branch, PR and evidence. Never skip a gate because the
   work is "small"; never exceed the scope because the Tool allows it.
6. **Communicate** in the Issue, deliver into `{Phase} In Review`, and continue the session.
7. **Block** and restore as described above; **accept** only as the user.
8. **Resume** from Issue + SPEC + PR + handoff comments, without depending on a chat. Never
   take over an apparently abandoned Issue unilaterally.

## Context receipt

`context --publish` creates the checkpoint that lets a later `take` or `move` prove the tool
re-read the Issue structure. It never proves that the agent read or understood the content.
The summary file must carry these exact headings; a missing one refuses publication:

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

Publish it with the real flags (configuration precedes the subcommand):

```bash
scripts/work-issue --repo OWNER/NAME --project N context --issue N --agent hermes \
  --publish --summary-file path/to/summary.md
```

A valid receipt carries `Autor`, `Rol`, `Fase`, `Tipo: Contexto`, the four sections, a
`Huella del contexto: <12 hex> (N comentarios)` line and, as the **last non-empty line**,
the exact `<!-- work-issue:context ... -->` marker. A comment that merely quotes the marker
is material, not a receipt, and does not accredit the reading. `Rol` is one of `Coordinador
funcional`, `Ejecutor`, `Revisor`; `Fase` is `Analysis`, `Specification` or `Development`, and
the visible fingerprint must agree with the marker. Publication is declared only after the
comment is read back: the persisted body must be the one emitted and still bound to the
current fingerprint, or the tool retracts its own comment and reports the failure.

The fingerprint covers title, body, Status, labels and every material comment. It
expires on **any** new comment — including the agent's own claim or report — and on `take`,
which changes Status. Publish a new receipt after `take` and before the first
`move`; a receipt from the `Ready` state authorizes nothing in `In Progress`.

## Agent routing

Routing uses the canonical label `agent:X`, where X is in the agent catalogue (default
`opencode`, `hermes`, `codex`, `claude`); the bare name (`codex`) is accepted as an alias. A
checkout may replace the catalogue with `agents:` in its local `.agents/tracker.local.yaml`
(`agents: claude, codex`). `agent:X` **fails closed** when X is unknown. At most one recognized
agent label; no agent label means any compatible agent. Two agent labels, an unknown agent or
insufficient capability mean report and wait. A session started without naming an agent works
the Issues without an agent label plus those labelled for the agent its client identifies
(`claude` in Claude Code); another agent's Issues are reported and never touched. The label is routing, not authorization and not
a reservation, and agents ignore the GitHub assignee entirely.

## Session continuity

`@work-issue <agent>` is one session over that agent's eligible queue, not a single
reservation: it recomputes the queue, recovers context, reserves, executes, delivers into
review and returns to the queue until no eligible work remains or a real blocker appears. It
holds **one reservation at a time**, never re-claims a returned Issue as a second reservation,
and finishes with a short ledger. Nothing schedules this loop: **no cron, webhook, bot or
login hook**, and no queue survives the session — the Project is the queue. An agent that
cannot start another agent's session publishes the assignment and says that agent has not
started.

## Communication and document ownership

The Issue is the main thread: objective, tracking, owners, phases, questions, human decisions
and authorizations, dependencies, results and links. Every substantive agent comment starts
with a header declaring real identity, so a shared GitHub account is never mistaken for
authorization:

```text
Autor: <agent>
Rol: Coordinador funcional | Ejecutor | Revisor
Fase: Analysis | Specification | Development
Tipo: Inicio | Contexto | Progreso | Informe | Bloqueo | Revisión | Handoff | Propuesta
Ejecutor: <when the publisher differs from the executor>
```

Status changes carry a `record` block with `- De: <current Status>` and `- A: <target Status>`;
`Previous Status` keeps that exact field name because the Project option and the pilot use it.
The markers (`<!-- work-issue:... -->`) are structural, not decorative: copying one into free
text or changing the header fields breaks receipt and block recognition.

| Surface | Owns |
| --- | --- |
| Issue | Objective, tracking, owners, phases, questions, human decisions and authorizations, dependencies, results; links the SPEC and PR. |
| SPEC and versioned documents | Approved requirements, architecture, contracts, acceptance criteria and durable procedures. |
| PR | Proposed change, technical review, test/QA evidence and the merge decision. |
| Harness | Reusable agent protocol and Skills; changed through a PR in the template, not through an Issue comment. |
| Project | Operational status and priority view; it never replaces the Issue or the SPEC contract. |

Link sources instead of copying them. Debates and authorizations belong in the Issue; durable
rules belong in a SPEC or the harness. A chat decision that affects the work is summarized in
the Issue before acting on it. Never attribute a decision to a human without explicit
confirmation, and never rewrite historical comments to add an identity.

## PR ↔ Issue linkage

The Issue is the work frame and may hold several PRs. Every PR is linked so it appears in the
Issue's `Development` section; closure is a human `Done` decision by intent, never a substitute
for acceptance.

1. Open the PR into the project's target branch (`feature/* → main`, or `feature/* → test →
   main` when the project requires it) with `Refs #N` in the body. `Closes`/`Fixes` are
   closing keywords: against the repository's default branch (`main`) they can close the Issue
   automatically on merge. They are unreliable for intermediate branches and never replace
   the explicit link.
2. Link immediately after creation: `addCloseIssueReferences(issueId, [pullRequestId])` through
   `gh api graphql`; verify both directions (`closedByPullRequestsReferences` on the Issue,
   `closingIssuesReferences` on the PR). Treat the native reference as closing-capable, not as
   a guarantee in either direction.
3. **After any merge, re-read the Issue.** A native closing link against the default branch can
   close it automatically: that is a real risk of the linkage, not an accepted flow. If the
   Issue closed and no human `Done` acceptance was recorded, reopen it and note the incident;
   if acceptance was already recorded, leave the closure alone. The harness documents this
   guard; it installs no bot and moves no Status on merge.

## Tool adapter

`scripts/work-issue` (`--help` lists its subcommands and flags; exit codes: `0` ok, `2` refused by the protocol with nothing changed or its own writes retracted, `3` blocked or failed write, `4` the agent's queue is empty) implements this protocol
for GitHub; another tracker adapts the same states without a new state engine. Configuration is explicit
and its flags precede the subcommand: `--repo` is required, `--owner` overrides an organization-owned
Project and `--project` is **never guessed**; without it the adapter fails closed, writes nothing and
invents no queue. A read that returns no work is diagnosed (empty Project, another repository's Issues, no
Ready status) without changing its exit code, and a read that fails is a blocker, never an empty queue.
`inventory`, `next` and every `--dry-run` are read-only.

The Project association is local state, not template content: a checkout may declare `repo`, `owner` and
`project` in `.agents/tracker.local.yaml`, a file that is never committed. Its values are the only valid
pair for that checkout and are passed explicitly on every call; a clone or a derived project never
inherits them.

Limits to declare, never overclaim: markers are unauthenticated structure (a shared account can publish
them), the receipt proves structure rather than reading, reservation has a read-then-write window, and
continuity belongs to the active session. No bot, cron, webhook or deployment is part of this protocol.

## Adopting it in a project

Adopt the statuses, the routing labels and this protocol together; keep the project's existing
branch model and CI contract. Do not migrate the historical backlog: apply the protocol to new
and open work only, and record the decision once. A derived project may keep working without a
Project through the manual protocol, and may adapt the protocol to another tracker, but never
with a second operational state.

## Stop conditions

Stop and report, without writing, when the Project or its permissions are unavailable, the
agent identity is not in the catalogue, the routing label is ambiguous or unknown, the Issue is
already claimed by another agent, a dependency is open or unverifiable, the history
exceeds the read limit, or the requested transition belongs to the user. Stopping one Issue
never stops a session: record the reason, keep it out of the queue and continue with the next
eligible Issue.
