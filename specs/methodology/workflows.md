# Adaptive workflow contract

> MyFinanzas: [project coordination and authorization gates](myfinanzas-coordination.md)
> override generic examples. Spec approval alone never starts dev06/spec07 here;
> development needs explicit scope authorization. Examples are not repository status.

The entry point is a natural-language request, optionally in read-only Codex Plan mode (/plan where supported). AGENTS.md recommends orchestrate; /plan does not invoke a Skill automatically. The user can explicitly invoke $orchestrate. Classify by risk. Quick may proceed after a one-line plan without another confirmation only for a clearly requested, reversible, low-risk change with no protected or stricter MyFinanzas gate. Consultation and Plan never authorize edits. Confirm Standard / Full unless explicitly authorized already for the same workflow and scope.

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

When model advice materially helps (normally Standard / Full), consult [Adaptive model selection](model-selection.md) on demand and recommend a capability tier and reasoning effort. Tier advice does not switch models; the absolute Codex subagent ceiling and the quota dispatch gate (including QA) remain mandatory. Omit redundant advice for straightforward Quick; never replace testing, review or required authorization.

## Approval gates
Require confirmation of classification except the authorized Quick case or existing explicit workflow authorization. Material financial/product/architecture choices, a revised roadmap, Full specifications, new development scope, significant escalation and PR merges retain separate protected approvals under [MyFinanzas coordination](myfinanzas-coordination.md). Ordinary changes/tests inside valid scope need no new approval, and authorized code or documentation work includes branch/PR publication under [approvals](approvals.md#publicación-de-rama-y-pr); merge still needs explicit approval. Approved specs remain authoritative but never grant development permission by themselves.

## Multi-epic scheduling

Follow [epic orchestration](epic-orchestration.md) and [dynamic agent management](dynamic-agents.md) for several overlapping Full features. The coordinator keeps a dependency-aware board and selects the next independent ready work across functional, implementation and QA. One awaiting-approval spec blocks its own dev, not drafting a different independent spec. An approved spec may hand off to dev and then QA within the active authorized run. Do not claim agents continue between sessions or allow merges without explicit approval.

## Delegation and portability
Skills are workflow descriptions, not separate agents. Reusable roles do not create permanent workers. The coordinator chooses the number and specialization of bounded work packets dynamically, subject to real client capabilities, dependencies and isolation. Prefer sequential execution when agent delegation is unavailable; multiagent is optional optimization. Scope each independent delegate with file ownership, expected checks and review requirements. No concurrent writes to the same files. Preserve implementation results in a way that supports Desktop and Web. Do not assume availability of local tools, hooks or credentials in cloud tasks.

## Evidence
Do not equate a successful build with user acceptance. State checks passed, failed, blocked and unrun separately. Review diffs before local commits. CI is the portable enforcement layer; any client lifecycle hooks are optional enhancements, not a substitute for tests or approval.
