# Adaptive workflow contract

> MyFinanzas: [project coordination and authorization gates](myfinanzas-coordination.md)
> override generic examples. Spec approval alone never starts dev06/spec07 here;
> development needs explicit scope authorization. Examples are not repository status.

The entry point is a natural-language request, optionally in Codex Plan mode (/plan where supported). AGENTS.md recommends orchestrate; /plan does not invoke any Skill automatically. The user can explicitly invoke $orchestrate. Start with inspection and a **proposed classification**, then **ask the user to confirm Quick / Standard / Full before implementation**.

| Workflow | Typical scope | Required preparation | Verification |
| --- | --- | --- | --- |
| Quick | Low-risk bounded bug/tweak | Short plan and observable expected result | Focused tests, diff review, relevant regressions |
| Standard | Bounded feature | Short plan, edge cases, concise acceptance checks | Implementation, tests, code review |
| Full | New project, cross-cutting feature, major architectural work | Discovery, approved decisions, applicable roadmap, approved feature spec | Incremental dev, QA, spec compliance and code review |

Risk matters more than code size. Auth, payments, production configuration, migrations, data deletion, security and incompatible contracts may require Full or elevated approval even for tiny edits.

## Full workflow routing
- New project: init-project discovery + project brainstorming if needed, architecture decision, bootstrap walking skeleton, roadmap approval, feature spec approval, dev and verification. Roadmap can be drafted provisionally earlier to select a useful vertical slice.
- Existing project, one complex feature: reuse context; run spec and dev. No redundant project init or roadmap.
- Multiple new epics: propose/update roadmap and confirm it; each epic still has its own spec and dev gates, but independent brainstorming, implementation, QA and infrastructure lanes may overlap under epic orchestration.
- Brainstorming is for unresolved requirements; preserve decisions and open questions. Do not force it for straightforward changes.
- Walking skeleton is a real minimal end-to-end executable slice, not a planning interview. Use bootstrap only when initializing a project or validating a meaningful new architectural path.

## Model and reasoning recommendation

Alongside the initial Quick / Standard / Full proposal, use [Adaptive model selection](model-selection.md) to recommend a capability tier and reasoning effort tailored to the work and user preference. This is advisory, not a new approval step or automatic model switch. Do not assume Desktop and Web expose the same options. A model suggestion never replaces testing, review, or user confirmation of the workflow.

## Approval gates
Require user confirmation for initial classification, material product/architecture choices, a new or materially revised roadmap, Full specifications and significant escalation of risk/scope. Ordinary code changes and tests inside the authorized scope do not need approval. Existing approved specs remain authoritative.

## Multi-epic scheduling

Follow [epic orchestration](epic-orchestration.md) and [dynamic agent management](dynamic-agents.md) for several overlapping Full features. The coordinator keeps a dependency-aware board and selects the next independent ready work across functional, implementation and QA. One awaiting-approval spec blocks its own dev, not drafting a different independent spec. An approved spec may hand off to dev and then QA within the active authorized run. Do not claim agents continue between sessions or allow merges without explicit approval.

## Delegation and portability
Skills are workflow descriptions, not separate agents. Reusable roles do not create permanent workers. The coordinator chooses the number and specialization of bounded work packets dynamically, subject to real client capabilities, dependencies and isolation. Prefer sequential execution when agent delegation is unavailable; multiagent is optional optimization. Scope each independent delegate with file ownership, expected checks and review requirements. No concurrent writes to the same files. Preserve implementation results in a way that supports Desktop and Web. Do not assume availability of local tools, hooks or credentials in cloud tasks.

## Evidence
Do not equate a successful build with user acceptance. State checks passed, failed, blocked and unrun separately. Review diffs before local commits. CI is the portable enforcement layer; any client lifecycle hooks are optional enhancements, not a substitute for tests or approval.
