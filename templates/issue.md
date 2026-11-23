# Issue template

Copy the blocks that apply. Keep the Issue self-sufficient: another agent must be able to act
on it without reading a chat. The protocol is [the issue workflow](../specs/methodology/issue-workflow.md);
a trivial correction needs no SPEC and no formal epic.

## Objective

One paragraph: the problem, the intended outcome and why it matters now.

## Requested phase

`Analysis` | `Specification` | `Development` — and what that phase must produce. Do not ask for
development before the scope is authorized; a phase request is not an authorization by itself.

## Scope

- In scope: concrete behaviour, files or surfaces.
- Out of scope: what must not change, and the neighbouring work that stays separate.

## Routing

Optional: one label `agent:opencode`, `agent:hermes`, `agent:codex` or `agent:claude` (the bare
name is an alias) to route the Issue to that agent; no label means any compatible agent. A
label is routing, never authorization. The GitHub assignee is ignored by agents.

## Linked SPEC

`specs/NN-slug-specification.md` (or `none yet: this Issue needs analysis first`). One SPEC may
produce several executable Issues; link the parent epic or roadmap row when it exists.

## Acceptance checks

- AC-01: action, input and the result that proves it.
- AC-02: the negative or error case that must also hold.

## Dependencies

`Depends on #N` for each hard dependency, or `None`. A dependency is satisfied only when it is
`Done`; an Issue still in review does not unblock this one. The number is resolved in this
repository only: a same-numbered Issue in another repository never satisfies it, and a
qualified `owner/repo#N` reference is unsupported and fails closed.

## Authorization and evidence

- Authorization: who authorized which phase and when, with a link to the comment or decision.
  `Pending` until a human records it; an agent comment is never an authorization.
- Tracker: Project and status when one exists, otherwise `manual protocol`. Everything starts
  in `Backlog`: generating documentation or tickets never marks work `Ready`.
- Evidence on delivery: branch and commit, PR, checks (PASS / FAIL / UNRUN) and the exact review
  request. Closure is a human `Done` decision: a native closing link can close the Issue on
  merge, so verify after any merge and reopen it if acceptance was not recorded.
