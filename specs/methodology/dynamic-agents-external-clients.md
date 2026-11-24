# External delegation

Load this document only when work is delegated to a client other than the one coordinating (Codex,
OpenCode). It completes [dynamic agent management](dynamic-agents.md), which keeps every shared gate;
nothing here relaxes them. The user talks only to the orchestrator: nobody copies packets or replies by
hand. [Agent Relay v1](../../.agents/skills/relay/SKILL.md) stays the optional repository-local transport when
the user explicitly opens a conversation (`relay init`) and triggers each read (`Lee`): transport only,
never approval, state or a second source of truth; no parallel or alternative relay is maintained.

## Configuration

`.agents/external-agents.json` lists per client `enabled`, `transport` (only `cli`), `model`, `effort`
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
- A missing file is an error in the template and in new projects. An existing project without it keeps
  only the automatic Codex review of a Claude Code coordinator and no other external delegation until the
  owner adds it. Invalid JSON, a `version` other than 1 or an unknown value: stop and report.
- A client runs only if this document has a section with its verified connection procedure. Otherwise
  report "no verified procedure" and stop.

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

Task types: `review` and `investigate` are read-only. `develop` stays `disabled` until writing is
validated in an isolated worktree; afterwards it also needs DEV authorization, file ownership and an
isolated checkout, and keeps QA and human merge. Concurrent writers need separate checkouts and disjoint
files. Delegates never use `work-issue`, claim Issues, write Project `Status`, delegate further or merge.

## Codex CLI

- Review: `codex review -c 'sandbox_mode="read-only"' -c 'approval_policy="never"' --base <base>`.
  Targeted review or investigation: `codex exec --sandbox read-only -c 'approval_policy="never"'
  --ephemeral -C <repo> -o <out> "<brief>"`. Add `-m <model>` only if the configuration sets `model`.
- The brief states it acts read-only, names the risks and paths and carries no conversation.
- Before relying on the run, check that `git rev-parse HEAD` equals the candidate SHA and that the CLI
  header shows `sandbox: read-only` and `approval: never`; otherwise the run did not meet the
  authorization. The header also prints `model`, `provider` and `reasoning effort` (step 5). If HEAD
  differs, stop: never switch branch or checkout in a tree that may hold other agents' work. If the tree
  holds unrelated changes, review the committed state (`--base` or `--commit`), never `--uncommitted`.
- Report each finding as VERIFIED, NOT VERIFIED or UNRUN after checking it against the code. A review is
  extra evidence: it does not approve and never replaces independent QA.
- If a usage limit is reached, report it and stop; never switch to paid API, credits, another plan or
  another provider.
- The read-only sandbox limits local shell writes, not remote writes through connectors the user's Codex
  exposes; the instruction not to write remotely is not a technical guarantee.

## OpenCode CLI

- From the repository root (the CLI has no directory option):
  `opencode run --agent review --title <task> "<brief>"`, adding `--model '<model>'` only if the
  configuration sets `model`. `review` and `investigate` use the read-only `review` agent. Never use
  `--auto`.
- The effective model appears in the output line `review · <model>`; the reasoning variant is not shown
  and is not required to be verified. Sessions are not archived or supervised.

## Observability

Run `<command> 2>&1 | tee artifacts/external/<task>.log` (ignored by Git), follow it with `tail -f` and
read the real exit code from `${PIPESTATUS[0]}` in bash (`${pipestatus[1]}` in zsh). No JSONL, dashboards or services; show only what the
client really emits.
