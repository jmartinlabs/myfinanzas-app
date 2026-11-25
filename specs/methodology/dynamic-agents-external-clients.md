# External delegation

Load this document only when work is delegated to a client other than the one coordinating (Codex,
OpenCode). It completes [dynamic agent management](dynamic-agents.md), which keeps every shared gate;
nothing here relaxes them. The user talks only to the orchestrator: nobody copies packets or replies by
hand. [Agent Relay v1](../../.agents/skills/relay/SKILL.md) stays the optional repository-local transport when
the user explicitly opens a conversation (`relay init`) and triggers each read (`Lee`): transport only,
never approval, state or a second source of truth; no parallel or alternative relay is maintained.

## Configuration

The [coordinator configuration](dynamic-agents.md#coordinator-configuration) selects the active
file. For example, `.agents/harnesses/claude.json` lists under `external` per client `enabled`, `transport` (only `cli`), `model`, `effort`
and `tasks`: `review`, `investigate` and `develop`, each `automatic`, `on_request` or `disabled`. It is
eligibility, never authorization: the effective permission is policy ∩ configuration, and only the owner
edits it.

- `automatic` is valid only for `review`: the standing authorization in
  [dynamic agents](dynamic-agents.md#standing-authorization-codex-cli-as-read-only-external-reviewer).
- `on_request` needs an explicit, unambiguous owner request in the chat; "investigate" or "review" never
  authorizes `develop`. `disabled` or `enabled: false` means do not launch.
- `model: null` inherits the client's native model: never pass `--model`, `-m` or `-c model=`, and never an
  empty value. A set model is passed as written; if it is unavailable, report and stop, never substitute
  a model or provider. `effort` goes to Codex as `-c model_reasoning_effort=…`; OpenCode carries it in
  the model (`provider/model#variant`); setting it where it is unsupported is reported as "not requestable".
- Missing coordinator file, absent client or absent task grants no external eligibility. Invalid JSON,
  a `version` other than 2 or an unknown field/value: stop and report. There is no legacy fallback.
  A client entry applies exclusively to the current coordinator. External entries have no profiles.
- The existing external routes originate in Claude Code. An entry for any other direction remains
  ineligible until that direction and task have a verified connection procedure. Otherwise report
  "no verified procedure" and stop.

## Procedure

1. Owner request (or the standing authorization) → client and task type.
2. Check `enabled` and `tasks`, the real authorization, the verified procedure, and that the client is
   installed and authenticated. If the client has no operational transport or does not answer within the
   time limit, report the limitation and stop that delegation; there is no manual alternative.
3. Build the [work packet](../../templates/agent-work-packet.md): scope, files, prohibitions, return. A
   brief is an instruction, not a technical barrier; use the client's native sandbox or permissions when
   they exist.
4. Launch with a log (see Observability) and keep the real exit code.
5. Check the effective model without changing anything: read what the client reports. With `model: null`
   note "inherited: observed `<X>`" or "inherited: not observable"; neither is an error. With a set model
   compare requested and observed; on a mismatch report it and do not rely on that run; if the client
   shows nothing, "not observable". Never retry with another model or provider and never edit the client's
   configuration.
6. Verify the result: it is evidence, never authorization or a merge request. Check the source, revision
   and real diff; required independent QA and merge approval stay with their owners. Record usage only
   from attributed client telemetry; never assume it is zero.

Task types: `review` and `investigate` are read-only. `develop` writes code, so it is `on_request` only and
needs, besides the explicit owner request, DEV authorization for the exact scope (`$work-issue` Status or the
phase's approval), declared file ownership, an isolated worktree on its own branch cut from the base
(never the shared checkout, `main` or `test`) and the delegate's own packet. It keeps independent QA, a PR
to `test` and human merge; the coordinator verifies source, revision and real diff before accepting. Concurrent
writers need separate checkouts and disjoint files. Delegates never use `work-issue`, claim Issues, write Project
`Status`, delegate further, push, open PRs or merge: only the coordinator integrates.

## Codex CLI

- Review: `codex review -c 'sandbox_mode="read-only"' -c 'approval_policy="never"' --base <base>`.
  Targeted review or investigation: `codex exec --sandbox read-only -c 'approval_policy="never"'
  --ephemeral -C <repo> -o <out> "<brief>"`. Add `-m <model>` only if the configuration sets `model`.
- Develop (only under the `develop` rules above): `codex exec --sandbox workspace-write -c 'approval_policy="never"'
  --ephemeral -C <isolated worktree> [-m <model>] [-c model_reasoning_effort=<effort>] "<brief>"`; the bracketed
  options only if the configuration sets them. The workspace-write sandbox may not reach the worktree's `.git`:
  the delegate edits files only and the coordinator reviews the diff and commits. Before relying on the run check that the worktree and branch are the
  authorized ones, that the CLI header shows `sandbox: workspace-write` and `approval: never`, and that the diff stays
  inside the declared files; never `--dangerously-bypass-approvals-and-sandbox`. The delegate does not push or merge.
- For `review` and `investigate`, the brief states it acts read-only, names the risks and paths and carries no
  conversation; a `develop` brief states its declared files and the prohibition to push, open PRs or merge.
- Before relying on a `review` or `investigate` run, check that `git rev-parse HEAD` equals the candidate SHA and
  that the CLI header shows `sandbox: read-only` and `approval: never`; otherwise the run did not meet the
  authorization. The header also prints `model`, `provider` and `reasoning effort` (step 5). If HEAD
  differs, stop: never switch branch or checkout in a tree that may hold other agents' work. If the tree
  holds unrelated changes, review the committed state (`--base` or `--commit`), never `--uncommitted`.
- Report each finding as VERIFIED, NOT VERIFIED or UNRUN after checking it against the code. A review is
  extra evidence: it does not approve and never replaces independent QA.
- If a usage limit is reached, report it and stop; never switch to paid API, credits, another plan or
  another provider.
- For `review` and `investigate`, the read-only sandbox limits local shell writes, not remote writes through connectors the user's Codex
  exposes; the instruction not to write remotely is not a technical guarantee.

## OpenCode CLI

- From the repository root (the CLI has no directory option):
  `opencode run --agent review --title <task> "<brief>"`, adding `--model '<model>'` only if the
  configuration sets `model`. `review` and `investigate` use the read-only `review` agent. Never use
  `--auto`.
- Develop (only under the `develop` rules above): from the root of the isolated worktree (the CLI has no
  directory option) `opencode run --title <task> "<brief>"`, adding `--model '<model>'` only if the configuration
  sets `model`; it uses the CLI's default agent, so check from the output line (`<agent> · <model>`) that it is a writing agent and
  not the read-only `review` one, and never use `--auto`. If the run stops at a permission request,
  report it and stop: do not widen permissions. Check the diff stays inside the declared files; the delegate does
  not push or merge.
- The effective model appears in the output line `review · <model>`; the reasoning variant is not shown
  and is not required to be verified. Sessions are not archived or supervised.

## Observability

Run `<command> 2>&1 | tee artifacts/external/<task>.log` (ignored by Git), follow it with `tail -f` and
read the real exit code from `${PIPESTATUS[0]}` in bash (`${pipestatus[1]}` in zsh). No JSONL, dashboards or services; show only what the
client really emits.
