# Private model selector

Issue515 replaces the fixed child-model ceiling with explicit user preferences. The
coordinator always keeps the model chosen in its client. No default ceiling, model-family
ranking, automatic substitution, credential lookup, model call or paid fallback is added.
The 25%/5% [quota gates](../specs/methodology/model-selection.md#quota-and-dispatch-gate),
independent QA and development/merge approvals remain unchanged.

Copy `.agents/models.example.yaml` to **`.agents/models.local.yaml`**. This is the single
private preference file; it is ignored by Git. Its `.yaml` extension uses the **strict JSON
subset of YAML 1.2**, parsed by Python's standard library. General YAML syntax, comments,
tags, anchors, duplicate keys, unknown fields and non-finite numbers are rejected. Python
3.10+ is required; this delivery was verified with Python3.12. Tests use the independent
standard-library TOML parser when available (3.11+), otherwise validate the narrow generated
string-table subset without an added dependency.
The versioned example declares the five roles as `example-provider`/`example-model`
placeholders: it shows the schema and contains no personal choice.

```json
{
  "version": 1,
  "coordinator": "client-selected",
  "roles": {
    "implementation": {"provider": "example-provider", "model": "example-model", "effort": "high"},
    "functional": {"provider": "example-provider", "model": "example-model", "effort": "high"},
    "review": {"provider": "example-provider", "model": "example-model", "effort": "high"},
    "qa": {"provider": "example-provider", "model": "example-model", "effort": "high"},
    "infrastructure": {"provider": "example-provider", "model": "example-model", "effort": "high"}
  },
  "clients": {},
  "constraints": {}
}
```

All values above are illustrative placeholders, not an availability claim. `version` and
`roles` are required. `coordinator`, if present, only accepts `client-selected`. Supported
roles are `implementation`, `functional`, `review`, `qa`, `infrastructure`; omit roles you do
not select. A selection requires `provider` and `model`; `effort` is optional and omitted
when no effort is requested. `clients` optionally supplies per-client `roles` overrides
for `codex`, `claude`, `opencode`, `hermes`; each override merges fields over the role's
base selection and must produce a complete selection. It cannot change the coordinator.

`constraints` is optional, with optional nonempty allowlists `providers`, `models`, `efforts`.
Only these explicit lists constrain choices; no field implies an ordering or a default
maximum. Model/provider/effort strings must be controlled identifiers (ASCII letters,
digits, `.`, `_`, `:`, `-`; models additionally allow `/`, excluding traversal). Credential
shapes, URLs, shell/control characters and secret-bearing unknown fields are rejected
without echoing their values. Legitimate provider names containing `token-plan` are allowed;
this validation cannot semantically identify every possible secret. Do not put credentials
in either file. `provider: inherit` resolves to the observed session provider and still
must satisfy any configured provider allowlist after resolution.

## Catalog and read-only preview

The tool never probes an account or reads authentication. There are two inputs, neither of
them a second preferences file:

- **`--catalog-from <client>`** derives the catalog from the installed client's own cheap,
  local listing command. For `opencode` that is `opencode models` (one `provider/model` per
  line); `opencode --version` supplies `version`. The tool runs no network of its own and
  reads no credentials; each command has a 30 s timeout and a missing or failing CLI is a
  clear `UNSUPPORTED ... CLI not found in PATH` / `... CLI exceeded 30s`, never a guess. The
  derived catalog lives **in memory**: nothing is written unless `--write-catalog` is passed,
  which stores it in `.agents/models.catalog.local.json` (Git ignored, untracked). `source`
  names the real command (`opencode-models-cli`) and `observed_at` is the UTC instant of
  observation.
- **A snapshot file**: `.agents/models.catalog.local.json` (ignored) or an explicit
  `--catalog /absolute/path/catalog.json`. Capture client version, native format, session
  provider and available model/effort tuples from the actual client's documented
  catalog/session controls.

`opencode models` does not expose reasoning variants, so derived rows carry `efforts: []` and
a selector declaring `effort` is refused for that catalog: drop `effort` (client default) or
record the variants with an explicit snapshot. `session_provider` is the first provider the
CLI lists, so declare `provider` explicitly instead of `inherit` when several are listed.
Only `opencode` has a documented cheap listing command; `codex`, `claude` and `hermes` answer
`UNSUPPORTED --catalog-from <client>` and require `--catalog`. Catalog structure:

```json
{
  "version": 1,
  "source": "local-client-observation",
  "observed_at": "2026-11-18T10:00:00Z",
  "clients": {
    "codex": {
      "version": "observed-version",
      "format": "codex-agents-toml-v1",
      "session_provider": "example-provider",
      "models": [{"provider": "example-provider", "model": "example-model", "efforts": ["low", "high"]}]
    }
  }
}
```

All catalog fields shown are required. `source` is an identifier describing provenance,
not a URL; `observed_at` is UTC `YYYY-MM-DDTHH:MM:SSZ`. `clients` may contain any supported
client, each with `version`, `format`, `session_provider`, `models`. Every model row requires
`provider`, `model`, `efforts`; `[]` accepts omission of effort, not any effort string.
Multiple providers per client are supported. Duplicate provider/model tuples are rejected.
Supported formats: `codex-agents-toml-v1`, `claude-subagents-v1`, `opencode-v2`, `manual`
respectively. These identify the researched native surfaces; use them only if the recorded
client version supports that format. Unknown formats refuse generation. The tool validates
the schema and selected tuples against **declared** input; neither the version nor source
string proves entitlement, authenticity, freshness or runtime availability. Reobserve when
client/version/account/catalog changes.

```sh
python3.12 scripts/models-sync --client codex --check
python3.12 scripts/models-sync --client codex --apply
python3.12 scripts/models-sync --client opencode --catalog-from opencode --check
python3.12 scripts/models-sync --client opencode --catalog-from opencode --write-catalog --check
```

The default action is `--check`: summary and proposed native diff, no directories, manifests,
file bytes or mtimes changed. `--write-catalog` requires `--catalog-from` and is the only
write admitted in `--check` mode; without it, `--check` leaves every byte and mtime untouched.
Omit `--client` to inspect all clients. Missing catalog/client is **UNVERIFIED**, exit2; apply
refuses. A missing selector reports UNCONFIGURED with
the example path and makes no writes. Unsupported choices/formats, conflicts and malformed
input also exit2. Exit0 means local configuration validation/generation only: **CONFIG_ONLY**,
never runtime PASS. All clients always report effective runtime **UNVERIFIED** until separate
attributable metadata verifies requested versus observed selection after dispatch.

`--apply` requires one explicit `--client`; it writes only private, Git-ignored, untracked
repository-local destinations. Default preferences/catalog are read only from the **current
Git root**, with no home, other checkout or profile guessing. `--root` must identify a Git
root, not a nested directory, a home/global root or a known client profile root. In linked
worktrees explicitly share the selector using `--config /absolute/path/models.local.yaml`;
external inputs are read only. Use resolved paths on macOS (`/private/tmp`, not symlinked
`/tmp` or `/var`). Symlink ancestors/files, hardlinked files and traversal destinations are
refused. Do not commit or paste private generated diffs.

## Native surfaces and limitations

| Client | Private output and dispatch | Limits |
| --- | --- | --- |
| Codex | `.codex/agents/models-local-<role>.toml`, dispatch `models-local-<role>` | Standalone custom-agent TOML with name, description, canonical developer instructions, model, optional reasoning effort. No coordinator `.codex/config.toml` edit. Provider/permissions inherit from the session; a different provider refuses. Desktop spawn consumption of CLI agent files is unverified: CONFIG_ONLY. |
| Claude Code | `.claude/agents/models-local-<role>.md`, dispatch `models-local-<role>` | Copies the existing native role, changing only declared name/model/effort and preserving prompt/tools/permissions. Simple scalar frontmatter only; complex/unknown syntax refuses. Provider inherits; a different provider refuses. Existing tracked agents remain available under their original names; explicitly dispatch the generated alias. |
| OpenCode V2 | `.opencode/opencode.json`, existing native role names | Generates plural `agents` with `provider/model#variant`, no root/coordinator model. Markdown prompts and permissions remain untouched. An existing Markdown `model` refuses because precedence is unverified. `review` retains its existing restricted query plugin. `qa` is written **only** when `.opencode/agents/qa.md` exists; otherwise the run prints `UNSUPPORTED OpenCode qa agent missing`, generates no inert `agents.qa` and exits2. |
| Hermes | No generated output | Profile `config_path` comes from `get_hermes_home`, not the current repository. Rich `model_map` requires the advanced-delegation plugin. Check reports MANUAL/UNSUPPORTED; apply refuses without writes. Configure an explicitly reviewed profile manually; verify the actual route with `scripts/check-delegation-route` using dispatch-time expectations. |

For Codex/Claude, `review` and `qa` read the **same** native prompt (`.agents/roles/qa-review.md`
or `.claude/agents/qa-review.md`) but are generated as **two independent aliases**,
`models-local-review` and `models-local-qa`, each with its own model/effort; different choices
are no longer a conflict, and identical choices still produce both. OpenCode uses one native
agent per role name, so `review` never stands in for `qa`. Upgrading from the earlier single
`models-local-qa-review` alias leaves that private file behind: remove it together with its
manifest entry (`STALE_OUTPUT` refuses until you do, by design).
Implementation/functional/infrastructure preserve their canonical role names after the
`models-local-` prefix. Existence of each source role is checked before generation. Codex/Claude also inspect only
repository-native agent directories for alias name declarations: another filename declaring
the desired alias conflicts; names that cannot be safely parsed refuse conservatively.

Native format research: [Codex agent configuration](https://learn.chatgpt.com/docs/agent-configuration/subagents),
[Claude subagents](https://code.claude.com/docs/en/sub-agents),
[OpenCode agents](https://opencode.ai/docs/agents/) and [configuration](https://opencode.ai/docs/config/).
Hermes config-path behavior was inspected in the installed CLI source; advanced plugin route
semantics and [effective-route checks](../specs/methodology/model-selection.md#delegation-routes-delegationbackend-model_map)
are separate from vanilla client support. No personal profile was edited or adapter launched.

## Ownership and safe regeneration

`.agents/models.manifest.local.json` records hashes of generated outputs and their canonical
source prompts. All destinations and all prior hashes are preflighted before any write.
Existing unowned files, tracked outputs, modified/missing generated files or changed source
prompts refuse the entire operation. No existing config is merged, so credentials/unrelated
settings are never overwritten. Removing an alias from preferences reports STALE_OUTPUT:
inspect and manually retire that private output and its manifest entry before regenerating;
the tool never silently leaves it represented as the requested active selection. When
retiring source entries, ensure no remaining output depends on that source.

Apply while the client is idle; activate/reload or restart it according to its actual version.
Files are replaced atomically one by one (new files0600, directories0700); ordinary write
failures roll back bytes and permissions and clean newly created paths. This is **not a
crash-atomic transaction across files**, nor protection against a malicious same-UID process
changing paths concurrently. No client/session is automatically activated. An unchanged
second apply preserves mtimes. Canonical prompt files/permissions are never rewritten.

Verification is isolated: `python3.12 scripts/test-models-sync` creates disposable Git
fixtures only, including negative schema/catalog cases, no-write previews, provider/model
compatibility, alias collisions, ownership, symlinks, rollback, coordinator preservation,
external preference inputs and Git ignore/track checks. It also covers review/qa separability
in Codex and Claude, the reported OpenCode `qa` gap, a fake `opencode` CLI on `PATH` for
`--catalog-from` (derived, missing CLI, `--write-catalog`), idempotence and a decoy `HOME` that
must stay empty. It does not test real account availability, entitlement, effective model
identity or client reload/dispatch.
