# Adaptive model selection (v2.2)

The coordinator recommends a **model capability tier and reasoning effort**, not a mandatory model switch. This is advice only; the user controls the model in Codex. Recommendations must be consistent with the models and reasoning settings actually exposed by the current client/plan. Never claim to have changed a model or inspected a model menu unless verified. Do not make model availability a prerequisite for using Quick, Standard, or Full.

## Inputs

- Task complexity and ambiguity, affected code, integration breadth, and risk of a mistake.
- Stage: discovery, roadmap/spec, implementation, QA, review.
- Preference: **balanced** (default), **efficiency** (lower latency/usage), or **quality** (higher reliability on difficult tasks).
- Actual model/effort options shown by the user's Codex environment, if known. Otherwise label the recommendation as a *capability tier* and ask the user to select the closest available option only when it matters.
- Current model: keep it if adequate; avoid disruptive switches for negligible benefit.

## Suggested starting points

| Work | Capability tier | Reasoning | Notes |
| --- | --- | --- | --- |
| Quick, straightforward tweak | efficient | low | Escalate for ambiguous failures, risky code or repeated verification failures |
| Standard, typical React/Effect feature | balanced | medium | Use high for complex debugging or nontrivial cross-module changes |
| Full, brainstorming / architecture / specification | advanced | high | Reason about tradeoffs and acceptance criteria; user still approves decisions |
| Full, routine implementation after approved spec | balanced | medium | Increase for hard code generation, integration failures, or uncertain requirements |
| QA, simple test maintenance | efficient or balanced | low or medium | Real test evidence remains mandatory |
| Critical review, auth/security/migrations/payment contracts | advanced | high | Consider extra high only when available and justified by complexity |

These are **starting heuristics**, not rules binding each workflow to one model. For example, a Quick security fix can require advanced/high; a well-specified Full implementation can be efficient/medium. Base decisions on impact rather than labels or file counts.

Use the broad tiers **efficient / balanced / advanced**. As illustrative current API-family analogies, Luna is optimized for efficiency, Sol for balanced work, and Astra for demanding analysis, but **Codex may offer different model labels and effort values**. Do not assume API names or options can be selected in Desktop/Web. Check official current docs when precise names matter: https://developers.openai.com/api/docs/guides/model-selection.

## Recommendation display

During the initial workflow proposal, show a compact single-line recommendation:

`Workflow: Standard | Model: balanced tier (use closest available option) | Reasoning: medium | Preference: balanced | Why: bounded API change with tests`

- Include the choice alongside the existing user confirmation for Quick / Standard / Full. **Do not add a second mandatory approval just to recommend a model.**
- For a quality-first priority, favor stronger reasoning/model when the work is ambiguous or consequential. For efficiency-first, choose the lightest adequate model without compromising safety, tests or review.
- If model/effort choices are unknown, say `suggested, availability unverified`, not a specific supposedly selectable model.
- When execution changes phase, only recommend a different setting if the benefit is meaningful; otherwise keep the current setting.
- Changing the model or effort is a **user-facing suggestion**; do not silently change sessions, imply that Skills can force it, or claim actual cost/quota savings without evidence.
- If a model is not available, stay with an available model and use smaller, testable increments. Escalation means asking the user to consider a stronger setting, not bypassing the approved scope.

## Quality guardrails

Model choice never replaces verification. Require actual acceptance tests, appropriate regression checks, and review even when a powerful model is selected. If verification fails, first investigate code and environment; recommend model escalation only when task difficulty or repeated reasoning failures justify it. Never downgrade safeguards to save tokens.

## Portability

This document lives in the repository and works as advice in Codex Desktop/Web even when automatic per-agent model selection is unavailable. Do not hardcode model names in AGENTS.md or assume subagents can be launched with independent model configurations.
